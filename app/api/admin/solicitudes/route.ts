import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET(req: NextRequest) {
  // Misma llave que el muro del sitio: la cookie solo la emite /api/login
  // contra SITE_PASSWORD. Se valida acá y no en proxy.ts porque al lanzar
  // matchcota.cl el muro general deja de aplicar y esta vista debe seguir cerrada.
  if (req.cookies.get('matchcota_auth')?.value !== 'ok') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('solicitudes')
    .select('*, mascotas(name, image, contact_nombre, contact_email, contact_telefono), refugios(nombre, email)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
