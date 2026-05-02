import { NextRequest, NextResponse } from 'next/server';

const FALLBACK = {
  tipo: '',
  raza: '',
  edad: '',
  color: '',
  descripcion: '',
};

export async function POST(req: NextRequest) {
  const { imageBase64 } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json(FALLBACK);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
                text: `Analiza esta foto de una mascota callejera y responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "tipo": "Perro" o "Gato" o el tipo de animal,
  "raza": "raza aproximada o Mestizo si no se puede determinar",
  "edad": "edad aproximada como Cachorro, Joven, Adulto o Senior",
  "color": "colores del pelaje",
  "descripcion": "descripción breve del estado y apariencia de la mascota en 1 oración en español"
}`,
              },
            ],
          },
        ],
        max_tokens: 300,
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
