import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { mascota_id, lat, lng, location, imagen, inicial } = await req.json();

    if (!mascota_id) {
      return NextResponse.json({ error: 'mascota_id requerido' }, { status: 400 });
    }

    // 1. Registrar avistamiento
    const { error: avError } = await supabase.from('avistamientos').insert({
      mascota_id,
      lat: lat ?? null,
      lng: lng ?? null,
      location: location ?? null,
      imagen: imagen ?? null,
    });

    if (avError) return NextResponse.json({ error: avError.message }, { status: 500 });

    // 2. Si es el avistamiento inicial (publicación), no incrementar contador
    if (inicial) {
      return NextResponse.json({ ok: true, count: 1 });
    }

    // 3. Incrementar contador + actualizar última ubicación conocida
    const { data: current } = await supabase
      .from('mascotas')
      .select('avistamientos_count')
      .eq('id', mascota_id)
      .single();

    const newCount = (current?.avistamientos_count ?? 1) + 1;

    await supabase.from('mascotas').update({
      avistamientos_count: newCount,
      ...(location ? { location } : {}),
      ...(lat ? { lat } : {}),
      ...(lng ? { lng } : {}),
    }).eq('id', mascota_id);

    return NextResponse.json({ ok: true, count: newCount });
  } catch (err) {
    console.error('avistamientos error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mascota_id = searchParams.get('mascota_id');

  if (!mascota_id) {
    return NextResponse.json({ error: 'mascota_id requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('avistamientos')
    .select('*')
    .eq('mascota_id', mascota_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
