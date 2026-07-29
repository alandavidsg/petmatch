import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
// URL de pruebas mientras matchcota.cl está en modo "Próximamente"; al lanzar, cambiar a https://matchcota.cl
const SITE_URL = 'https://matchcotacl-alan-s-team.vercel.app';

// Distancia en km entre dos puntos (haversine)
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  try {
    const { mascota_id } = await req.json();
    if (!mascota_id) {
      return NextResponse.json({ error: 'mascota_id requerido' }, { status: 400 });
    }

    // 1. Obtener la mascota
    const { data: mascota } = await supabaseAdmin
      .from('mascotas')
      .select('id, name, type, breed, image, location, lat, lng, refugio_id')
      .eq('id', mascota_id)
      .single();

    if (!mascota) {
      return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 });
    }

    // Si la publicó un refugio, ese refugio ya es el dueño: no hay nada que asignar
    if (mascota.refugio_id) {
      return NextResponse.json({ skipped: 'publicada por un refugio' });
    }

    // Sin coordenadas no se puede calcular cercanía
    if (mascota.lat == null || mascota.lng == null) {
      return NextResponse.json({ skipped: 'mascota sin coordenadas' });
    }

    // 2. Refugios aprobados con ubicación
    const { data: refugios } = await supabaseAdmin
      .from('refugios')
      .select('id, nombre, email, lat, lng')
      .eq('aprobado', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (!refugios || refugios.length === 0) {
      return NextResponse.json({ skipped: 'sin refugios con ubicación' });
    }

    // 3. Refugio más cercano
    let nearest = refugios[0];
    let minDist = distanciaKm(mascota.lat, mascota.lng, nearest.lat, nearest.lng);
    for (const r of refugios.slice(1)) {
      const d = distanciaKm(mascota.lat, mascota.lng, r.lat, r.lng);
      if (d < minDist) {
        minDist = d;
        nearest = r;
      }
    }

    // 4. Registrar el refugio cercano. Es informativo: no le da la propiedad de
    //    la mascota ni redirige las solicitudes de adopción (esas van a quien publicó).
    await supabaseAdmin.from('mascotas').update({ refugio_cercano_id: nearest.id }).eq('id', mascota.id);

    // 5. Notificar por email (no bloquea la asignación)
    if (nearest.email && process.env.RESEND_API_KEY) {
      try {
        const petName = mascota.name ?? 'Mascota';
        const petType = mascota.breed ? `${mascota.type} ${mascota.breed}` : mascota.type ?? '';
        const petImage = mascota.image ?? '';
        const petLocation = mascota.location ?? '';
        const distancia = minDist < 1 ? `${Math.round(minDist * 1000)} m` : `${minDist.toFixed(1)} km`;

        await resend.emails.send({
          from: 'Matchcota <notificaciones@matchcota.cl>',
          to: nearest.email,
          subject: `🐾 Nueva mascota cerca de tu refugio: ${petName}`,
          html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
            <span style="font-size:28px;font-weight:bold;color:#e86c00;">Matchcota</span>
            <p style="color:#aaaaaa;font-size:13px;margin:6px 0 0;">Plataforma de adopción de mascotas</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff3e6;padding:16px 32px;border-bottom:1px solid #fde8c8;">
            <p style="margin:0;color:#e86c00;font-weight:bold;font-size:15px;">🐾 Se publicó una mascota cerca de tu refugio (a ${distancia})</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${petImage ? `<td width="90" style="vertical-align:top;padding-right:16px;">
                  <img src="${petImage}" width="80" height="80" style="border-radius:12px;object-fit:cover;display:block;" alt="${petName}"/>
                </td>` : ''}
                <td style="vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1a1a2e;">${petName}</p>
                  ${petType ? `<p style="margin:0 0 4px;font-size:13px;color:#888;">${petType}</p>` : ''}
                  ${petLocation ? `<p style="margin:0;font-size:13px;color:#aaa;">📍 ${petLocation}</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <a href="${SITE_URL}/mascota/${mascota.id}" style="display:inline-block;background:#e86c00;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;">
              Ver ficha de ${petName}
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;">
              Te avisamos porque tu refugio es el más cercano al lugar del reporte.<br>
              <a href="${SITE_URL}/refugios/panel" style="color:#e86c00;text-decoration:none;">Ir al panel</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      } catch (emailErr) {
        console.error('Email error (asignación guardada igual):', emailErr);
      }
    }

    return NextResponse.json({ ok: true, refugio_cercano_id: nearest.id, distancia_km: minDist });
  } catch (err) {
    console.error('asignar refugio error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
