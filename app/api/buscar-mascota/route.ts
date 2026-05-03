import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

type Pet = {
  id: number;
  name: string;
  type: string;
  breed: string;
  image: string;
  location: string;
};

type Match = Pet & { similitud: number; razon: string };

type Analysis = {
  tipo: string;
  raza: string;
  color: string;
  descripcion: string;
};

// Paso 1: analiza la foto y extrae tipo, raza, color y descripción
async function analyzeLostPet(imageBase64: string): Promise<Analysis> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageBase64 } },
          {
            type: 'text',
            text: `Analiza esta mascota y responde ÚNICAMENTE con JSON válido sin texto adicional:
{
  "tipo": "Perro" o "Gato" u otro tipo,
  "raza": "nombre exacto de la raza en español, ej: Husky Siberiano, Golden Retriever, Mestizo",
  "color": "colores principales del pelaje",
  "descripcion": "descripción visual detallada en 2-3 oraciones: raza, color, marcas distintivas, tamaño, características únicas"
}`,
          },
        ],
      }],
      max_tokens: 300,
      temperature: 0.1,
    }),
  });

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* empty */ }
  return { tipo: '', raza: '', color: '', descripcion: '' };
}

// Paso 2: ranking visual entre mascotas ya filtradas por raza/tipo
async function rankByVisualSimilarity(description: string, pets: Pet[]): Promise<Match[]> {
  if (pets.length === 0) return [];

  const contents: object[] = [
    {
      type: 'text',
      text: `Mascota buscada:\n"${description}"\n\nOrdena las siguientes fotos de mascotas por similitud visual con la descripción anterior. Considera color del pelaje, marcas, tamaño y características únicas.`,
    },
  ];

  pets.forEach((pet, i) => {
    contents.push({ type: 'image_url', image_url: { url: pet.image } });
    contents.push({ type: 'text', text: `Foto ${i + 1}: ID=${pet.id}, Nombre="${pet.name}"` });
  });

  contents.push({
    type: 'text',
    text: `Responde ÚNICAMENTE con JSON válido sin bloques de código:
[{"id": <número>, "similitud": <0-100>, "razon": "<razón breve en español>"}]
Incluye todas las mascotas.`,
  });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: contents }],
      max_tokens: 600,
      temperature: 0.1,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';

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

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    // 1. Analizar la foto subida
    const analysis = await analyzeLostPet(imageBase64);
    console.log('Analysis:', analysis);

    if (!analysis.tipo && !analysis.raza) {
      return NextResponse.json({ matches: [], analysis });
    }

    // 2. Buscar en catálogo por raza (principal) y/o tipo (fallback)
    //    Extrae palabras clave de la raza para buscar variantes
    const razaKeywords = analysis.raza
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 3); // palabras significativas

    let query = supabase
      .from('mascotas')
      .select('id, name, type, breed, image, location')
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
    let breedMatches = allPets.filter((pet) => {
      const petBreed = pet.breed?.toLowerCase() ?? '';
      return razaKeywords.some((kw) => petBreed.includes(kw));
    });

    // Si no hay coincidencias por raza, usar todos los del mismo tipo
    const petsToCompare = breedMatches.length > 0 ? breedMatches : allPets;
    console.log(`Comparing against ${petsToCompare.length} pets (breed match: ${breedMatches.length})`);

    // 4. Ranking visual en lotes de 5
    const BATCH = 5;
    const allMatches: Match[] = [];
    for (let i = 0; i < petsToCompare.length; i += BATCH) {
      const batch = petsToCompare.slice(i, i + BATCH);
      const ranked = await rankByVisualSimilarity(analysis.descripcion, batch);
      allMatches.push(...ranked);
    }

    // 5. Ordenar y devolver top 6
    const sorted = allMatches.sort((a, b) => b.similitud - a.similitud).slice(0, 6);

    return NextResponse.json({ matches: sorted, analysis });
  } catch (err) {
    console.error('buscar-mascota error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
