import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mascota_id, nombre_adoptante, email_adoptante, telefono_adoptante, mensaje, tipo } = body;

    if (!mascota_id || !nombre_adoptante || !email_adoptante) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const tipoSolicitud = tipo === 'hogar_temporal' ? 'hogar_temporal' : 'adopcion';

    // 1. Obtener la mascota. El destinatario se resuelve acá y no desde el body:
    //    solo el refugio que PUBLICÓ la mascota recibe sus solicitudes; el refugio
    //    cercano asignado por geolocalización es informativo y no interviene.
    const { data: mascota } = await supabase
      .from('mascotas')
      .select('name, type, breed, image, location, contact_email, refugio_id')
      .eq('id', mascota_id)
      .single();

    if (!mascota) {
      return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 });
    }

    let destinatario: string | null = null;
    if (mascota.refugio_id) {
      const { data: refugio } = await supabase
        .from('refugios')
        .select('email')
        .eq('id', mascota.refugio_id)
        .single();
      destinatario = refugio?.email ?? null;
    } else {
      destinatario = mascota.contact_email ?? null;
    }

    // 2. Insertar solicitud
    const { data: solicitud, error: insertError } = await supabase
      .from('solicitudes')
      .insert({ mascota_id, refugio_id: mascota.refugio_id ?? null, nombre_adoptante, email_adoptante, telefono_adoptante, mensaje, tipo: tipoSolicitud })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message, details: insertError }, { status: 500 });
    }

    // 3. Enviar email si hay destinatario (error no bloquea la solicitud)
    if (!destinatario) {
      console.warn(`solicitud ${solicitud?.id} sin destinatario: mascota ${mascota_id} no tiene refugio ni contact_email`);
    }
    if (destinatario && process.env.RESEND_API_KEY) { try {
      const esHogarTemporal = tipoSolicitud === 'hogar_temporal';
      const petName = mascota?.name ?? 'Mascota';
      const petType = mascota?.breed ? `${mascota.type} ${mascota.breed}` : mascota?.type ?? '';
      const petLocation = mascota?.location ?? '';
      const petImage = mascota?.image ?? '';
      // URL de pruebas mientras matchcota.cl está en modo "Próximamente"; al lanzar, cambiar a https://matchcota.cl
      const siteUrl = 'https://matchcotacl-alan-s-team.vercel.app';

      await resend.emails.send({
        from: 'Matchcota <notificaciones@matchcota.cl>',
        to: destinatario,
        subject: esHogarTemporal
          ? `🏡 Nueva solicitud de hogar temporal para ${petName}`
          : `🐾 Nueva solicitud de adopción para ${petName}`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
            <span style="font-size:28px;font-weight:bold;color:#e86c00;">Matchcota</span>
            <p style="color:#aaaaaa;font-size:13px;margin:6px 0 0;">Plataforma de adopción de mascotas</p>
          </td>
        </tr>

        <!-- Alerta -->
        <tr>
          <td style="background:#fff3e6;padding:16px 32px;border-bottom:1px solid #fde8c8;">
            <p style="margin:0;color:#e86c00;font-weight:bold;font-size:15px;">${esHogarTemporal ? '🏡 ¡Tienes una nueva solicitud de hogar temporal!' : '🐾 ¡Tienes una nueva solicitud de adopción!'}</p>
          </td>
        </tr>

        <!-- Mascota -->
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

        <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #eeeeee;"></td></tr>

        <!-- Datos del solicitante -->
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 16px;font-size:14px;font-weight:bold;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.5px;">Datos del solicitante</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eeeeee;">
                  <span style="font-size:12px;color:#999;">Nombre</span><br>
                  <span style="font-size:15px;color:#1a1a2e;font-weight:600;">${nombre_adoptante}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eeeeee;">
                  <span style="font-size:12px;color:#999;">Email</span><br>
                  <a href="mailto:${email_adoptante}" style="font-size:15px;color:#e86c00;text-decoration:none;">${email_adoptante}</a>
                </td>
              </tr>
              ${telefono_adoptante ? `<tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eeeeee;">
                  <span style="font-size:12px;color:#999;">Teléfono</span><br>
                  <a href="tel:${telefono_adoptante}" style="font-size:15px;color:#e86c00;text-decoration:none;">${telefono_adoptante}</a>
                </td>
              </tr>` : ''}
              ${mensaje ? `<tr>
                <td style="padding:12px 16px;">
                  <span style="font-size:12px;color:#999;">Mensaje</span><br>
                  <span style="font-size:14px;color:#444;line-height:1.5;">${mensaje}</span>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <a href="${siteUrl}/mascota/${mascota_id}" style="display:inline-block;background:#e86c00;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;">
              Ver ficha de ${petName}
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;">
              Este email fue enviado automáticamente por Matchcota.<br>
              <a href="${siteUrl}" style="color:#e86c00;text-decoration:none;">matchcota.cl</a>
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
      console.error('Email error (solicitud guardada igual):', emailErr);
    } }

    return NextResponse.json({ ok: true, id: solicitud?.id });
  } catch (err) {
    console.error('solicitudes error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
