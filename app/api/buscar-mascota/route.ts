import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../lib/rateLimit';
import { trackAiUsage } from '../../../lib/aiUsage';
import {
  GROQ_MODEL,
  groqChatCompletion,
  analyzePetImage,
  getOrCreateVisualDescription,
} from '../../../lib/petVision';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Pet = {
  id: number;
  name: string;
  type: string;
  breed: string;
  image: string;
  location: string;
  visual_description: string | null;
};

type Match = Pet & { similitud: number; razon: string };

// La IA a veces devuelve el nombre de la raza en español y la BD lo tiene en inglés (o viceversa).
// Sinónimos de razas comunes para que el filtro por palabra clave encuentre ambas variantes.
const RAZA_SINONIMOS: Record<string, string[]> = {
  caniche: ['poodle'],
  poodle: ['caniche'],
  pastor: ['shepherd'],
  shepherd: ['pastor'],
  salchicha: ['dachshund', 'teckel'],
  dachshund: ['salchicha', 'teckel'],
  teckel: ['salchicha', 'dachshund'],
  bulldog: ['bulldog'],
  chihuahua: ['chihuahua'],
  labrador: ['labrador'],
  husky: ['husky'],
};

function expandirSinonimos(keywords: string[]): string[] {
  const expandido = new Set(keywords);
  for (const kw of keywords) {
    (RAZA_SINONIMOS[kw] ?? []).forEach((s) => expandido.add(s));
  }
  return [...expandido];
}

// Ranking visual por texto: compara la descripción de la mascota buscada contra las
// descripciones ya cacheadas del catálogo. Una sola llamada de texto (sin imágenes)
// para todo el lote, en vez de re-enviar cada foto en cada búsqueda.
async function rankByDescription(searchedDescription: string, pets: Pet[]): Promise<Match[]> {
  if (pets.length === 0) return [];

  const catalogText = pets
    .map((p) => `ID=${p.id} | Nombre="${p.name}" | Descripción: ${p.visual_description}`)
    .join('\n');

  const response = await groqChatCompletion({
    model: GROQ_MODEL,
    reasoning_effort: 'none',
    messages: [{
      role: 'user',
      content: `Mascota buscada:\n"${searchedDescription}"\n\nCatálogo de mascotas candidatas:\n${catalogText}\n\nOrdena las mascotas candidatas por similitud visual con la mascota buscada, considerando color del pelaje, marcas, tamaño y características únicas descritas en el texto.\n\nResponde ÚNICAMENTE con JSON válido sin bloques de código:\n[{"id": <número>, "similitud": <0-100>, "razon": "<razón breve en español>"}]\nIncluye todas las mascotas candidatas.`,
    }],
    max_tokens: 800,
    temperature: 0.1,
  });

  if (!response.ok) {
    console.error('Groq rankByDescription error:', response.status, await response.text());
    return [];
  }

  const result = await response.json();
  const text: string = result.choices?.[0]?.message?.content ?? '';

  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = clean.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const results = JSON.parse(jsonMatch[0]) as { id: number; similitud: number; razon: string }[];
    return results
      .map((r) => {
        const pet = pets.find((p) => p.id === r.id);
        if (!pet) return null;
        return { ...pet, similitud: r.similitud, razon: r.razon };
      })
      .filter((r): r is Match => r !== null);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed } = rateLimit(ip, 5); // 5 búsquedas por minuto por IP
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas búsquedas. Espera un momento antes de intentarlo de nuevo.' },
      { status: 429 }
    );
  }

  await trackAiUsage('groq_search');

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    // 1. Analizar la foto subida (1 llamada con imagen)
    const analysis = await analyzePetImage(imageBase64);
    console.log('Analysis:', analysis);

    if (!analysis.tipo && !analysis.raza) {
      return NextResponse.json({ matches: [], analysis });
    }

    // 2. Buscar en catálogo por raza (principal) y/o tipo (fallback)
    //    Extrae palabras clave de la raza para buscar variantes (+ sinónimos ES/EN)
    const razaKeywords = expandirSinonimos(
      analysis.raza
        .toLowerCase()
        .split(' ')
        .filter((w) => w.length > 3) // palabras significativas
    );

    let query = supabase
      .from('mascotas')
      .select('id, name, type, breed, image, location, visual_description')
      .eq('available', true)
      .not('image', 'is', null);

    // Filtrar por tipo primero (Perro, Gato, etc.)
    if (analysis.tipo) {
      query = query.ilike('type', `%${analysis.tipo}%`);
    }

    const { data: allPets } = await query;
    if (!allPets || allPets.length === 0) {
      return NextResponse.json({ matches: [], analysis });
    }

    // 3. Filtrar por raza usando coincidencia de palabras clave
    const breedMatches = allPets.filter((pet) => {
      const petBreed = pet.breed?.toLowerCase() ?? '';
      return razaKeywords.some((kw) => petBreed.includes(kw));
    });

    // Si no hay coincidencias por raza, usar todos los del mismo tipo.
    // Tope de mascotas a comparar visualmente para no descargar/comparar catálogos enormes.
    const MAX_COMPARE = 18;
    const petsToCompare = (breedMatches.length > 0 ? breedMatches : allPets).slice(0, MAX_COMPARE);
    console.log(`Comparing against ${petsToCompare.length} pets (breed match: ${breedMatches.length})`);

    // 4. Separar lo ya cacheado (respuesta inmediata) de lo que falta describir.
    //    Generar una descripción nueva puede chocar con el rate limit de Groq y
    //    necesitar reintento con espera — hacerlo DENTRO de esta request (como
    //    antes) podía sumar minutos si varias mascotas estaban sin cachear, y el
    //    usuario se quedaba viendo "Buscando..." indefinidamente. Ahora solo se
    //    usa lo que ya está cacheado para responder, y lo faltante se genera
    //    en segundo plano con after() para que la próxima búsqueda ya lo tenga.
    let yaDescriptas = petsToCompare.filter(
      (p): p is Pet & { visual_description: string } => !!p.visual_description
    );
    const porDescribir = petsToCompare.filter((p) => !p.visual_description);

    if (porDescribir.length > 0) {
      after(async () => {
        for (const pet of porDescribir) {
          await getOrCreateVisualDescription(pet);
        }
      });
    }

    // Red de seguridad: el filtro por raza deja grupos muy chicos (ej. 3 Golden
    // Retriever) y si NINGUNO está descrito todavía no queda nada que rankear,
    // así que la búsqueda respondía "sin coincidencias" aunque el catálogo sí
    // tuviera candidatas. En ese caso se amplía a las del mismo tipo que sí
    // tengan descripción: una coincidencia aproximada es mejor que ninguna.
    const aproximado = yaDescriptas.length === 0;
    if (aproximado) {
      yaDescriptas = allPets
        .filter((p): p is Pet & { visual_description: string } => !!p.visual_description)
        .slice(0, MAX_COMPARE);
    }

    // 5. Ranking visual por texto (1 sola llamada, sin imágenes de catálogo)
    const sorted = (await rankByDescription(analysis.descripcion, yaDescriptas))
      .sort((a, b) => b.similitud - a.similitud)
      .slice(0, 6);

    return NextResponse.json({
      matches: sorted,
      analysis,
      calentando: porDescribir.length > 0 ? porDescribir.length : undefined,
      // El ranking no encontró nada descrito de esa raza y comparó contra el
      // resto del mismo tipo — la interfaz lo aclara para no dar a entender
      // que son coincidencias de raza.
      aproximado: aproximado && sorted.length > 0 ? true : undefined,
    });
  } catch (err) {
    console.error('buscar-mascota error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
