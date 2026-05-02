import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return NextResponse.json({ articles: [] });

  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=mascotas+OR+perros+OR+gatos+OR+adopcion+animales&lang=es&max=10&apikey=${apiKey}`,
      { next: { revalidate: 3600 } } // cache 1 hora
    );

    if (!res.ok) return NextResponse.json({ articles: [] });

    const data = await res.json();
    return NextResponse.json({ articles: data.articles || [] });
  } catch {
    return NextResponse.json({ articles: [] });
  }
}
