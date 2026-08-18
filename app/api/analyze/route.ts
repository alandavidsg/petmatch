import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '../../../lib/rateLimit';
import { trackAiUsage } from '../../../lib/aiUsage';

const FALLBACK = {
  tipo: '',
  raza: '',
  edad: '',
  color: '',
  descripcion: '',
  descripcion_visual: '',
  es_animal: false,
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed } = rateLimit(ip, 10); // 10 análisis por minuto por IP
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.' },
      { status: 429 }
    );
  }

  const { imageBase64 } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json(FALLBACK);

  await trackAiUsage('groq_analyze');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        reasoning_effort: 'none',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageBase64 },
              },
              {
                type: 'text',
                text: `Analiza esta imagen y responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "es_animal": true o false (true solo si es una foto real de un animal real, false si es una persona, objeto, lugar, dibujo, meme, captura de pantalla u otra cosa),
  "tipo": "Perro" o "Gato" o el tipo de animal (vacío si no es animal),
  "raza": "raza aproximada o Mestizo si no se puede determinar (vacío si no es animal)",
  "edad": "Cachorro, Joven, Adulto o Senior (vacío si no es animal)",
  "color": "colores del pelaje (vacío si no es animal)",
  "descripcion": "descripción breve en 1 oración en español (vacío si no es animal)",
  "descripcion_visual": "descripción visual detallada en 2-3 oraciones: raza, color, marcas distintivas, tamaño y características únicas (vacío si no es animal)"
}`,
              },
            ],
          },
        ],
        // 500 y no 400: además de los campos del formulario ahora se pide
        // `descripcion_visual` (2-3 oraciones), que es lo que la búsqueda de
        // mascotas perdidas usa como caché para rankear sin re-mirar la foto.
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq error:', response.status, err);
      return NextResponse.json(FALLBACK);
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';

    console.log('Groq response:', text);

    const jsonMatch = text.replace(/```json\n?|\n?```/g, '').trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json(FALLBACK);

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json(FALLBACK);
  }
}
