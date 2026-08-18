import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { getOrCreateVisualDescription } from '../../../../lib/petVision';

// Cuántas mascotas describir por llamada. Cada foto le cuesta a Groq ~1.900
// tokens y el plan permite 8.000 por minuto, así que 4 entra justo en una
// ventana. La página de admin llama a este endpoint en loop hasta terminar,
// en vez de intentar todo el catálogo en una sola request (que se pasaría
// del tiempo máximo de ejecución y del rate limit).
const LOTE = 4;

type PendingPet = { id: number; name: string; image: string; visual_description: string | null };

export async function POST(req: NextRequest) {
  // Misma llave que el muro del sitio, validada acá y no en proxy.ts: al lanzar
  // matchcota.cl el muro general deja de aplicar y esto debe seguir cerrado.
  if (req.cookies.get('matchcota_auth')?.value !== 'ok') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { count: pendientesAntes } = await supabaseAdmin
    .from('mascotas')
    .select('id', { count: 'exact', head: true })
    .eq('available', true)
    .not('image', 'is', null)
    .is('visual_description', null);

  const { data: pets, error } = await supabaseAdmin
    .from('mascotas')
    .select('id, name, image, visual_description')
    .eq('available', true)
    .not('image', 'is', null)
    .is('visual_description', null)
    .order('id', { ascending: true })
    .limit(LOTE);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const procesadas: { id: number; name: string; ok: boolean }[] = [];
  for (const pet of (pets ?? []) as PendingPet[]) {
    const desc = await getOrCreateVisualDescription(pet);
    procesadas.push({ id: pet.id, name: pet.name, ok: !!desc });
  }

  const exitosas = procesadas.filter((p) => p.ok).length;

  return NextResponse.json({
    procesadas,
    exitosas,
    // Lo que quedaba antes de este lote, menos lo que efectivamente se describió.
    // Las que fallaron siguen contando como pendientes para el próximo intento.
    restantes: Math.max((pendientesAntes ?? 0) - exitosas, 0),
  });
}

export async function GET(req: NextRequest) {
  if (req.cookies.get('matchcota_auth')?.value !== 'ok') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { count: total } = await supabaseAdmin
    .from('mascotas')
    .select('id', { count: 'exact', head: true })
    .eq('available', true)
    .not('image', 'is', null);

  const { count: pendientes } = await supabaseAdmin
    .from('mascotas')
    .select('id', { count: 'exact', head: true })
    .eq('available', true)
    .not('image', 'is', null)
    .is('visual_description', null);

  return NextResponse.json({ total: total ?? 0, pendientes: pendientes ?? 0 });
}
