import { supabaseAdmin } from './supabase-admin';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
export const GROQ_MODEL = 'qwen/qwen3.6-27b';

export type Analysis = {
  tipo: string;
  raza: string;
  color: string;
  descripcion: string;
};

/**
 * Llama a Groq y, si choca con el rate limit (429), espera lo que Groq pide
 * ("Please retry in X.Ys") y reintenta UNA vez. Varias llamadas seguidas pueden
 * sumar más de las 8.000 tokens/minuto del plan aunque cada una sea liviana; el
 * retry evita perder una mascota solo por mala suerte de timing.
 */
export async function groqChatCompletion(body: object): Promise<Response> {
  const call = () =>
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const first = await call();
  if (first.status !== 429) return first;

  const errText = await first.text();
  const waitMatch = errText.match(/retry in ([\d.]+)s/i);
  const waitMs = Math.min(waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) : 10_000, 25_000);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return call();
}

/**
 * Analiza una foto (URL remota o data URI, Groq acepta ambas) y extrae tipo,
 * raza, color y descripción visual.
 */
export async function analyzePetImage(imageUrl: string): Promise<Analysis> {
  const response = await groqChatCompletion({
    model: GROQ_MODEL,
    reasoning_effort: 'none',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
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
    max_tokens: 400,
    temperature: 0.1,
  });

  if (!response.ok) {
    console.error('Groq analyzePetImage error:', response.status, await response.text());
    return { tipo: '', raza: '', color: '', descripcion: '' };
  }

  const result = await response.json();
  const text: string = result.choices?.[0]?.message?.content ?? '';
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* empty */ }
  console.error('Groq analyzePetImage: no se pudo parsear JSON. Texto crudo:', text);
  return { tipo: '', raza: '', color: '', descripcion: '' };
}

/**
 * Genera y guarda la descripción visual de una mascota si todavía no la tiene.
 * Devuelve la descripción (nueva o existente), o null si la IA no pudo generarla.
 *
 * Lo normal es que la descripción se guarde al publicar (ver /api/analyze), así
 * que esto es la red de recuperación para las mascotas publicadas antes de eso
 * o cuando el análisis del formulario falló.
 */
export async function getOrCreateVisualDescription(pet: {
  id: number;
  image: string;
  visual_description: string | null;
}): Promise<string | null> {
  if (pet.visual_description) return pet.visual_description;

  const analysis = await analyzePetImage(pet.image);
  if (!analysis.descripcion) return null;

  await supabaseAdmin.from('mascotas').update({ visual_description: analysis.descripcion }).eq('id', pet.id);
  return analysis.descripcion;
}
