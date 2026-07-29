-- ============================================================
-- Contacto del publicador + separar "refugio dueño" de "refugio cercano"
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Datos de contacto de quien publica una mascota en adopción.
--    Antes se guardaban pegados como texto dentro de `description`, así que
--    el destinatario de las solicitudes nunca se podía resolver.
alter table public.mascotas
  add column if not exists contact_email    text,
  add column if not exists contact_nombre   text,
  add column if not exists contact_telefono text;

-- 2. Refugio más cercano, solo informativo (mapa + aviso "hay una mascota cerca").
--    Se separa de `refugio_id`, que ahora significa únicamente "este refugio
--    publicó la mascota y es su dueño" (da permiso de editar/borrar y recibe
--    las solicitudes de adopción).
alter table public.mascotas
  add column if not exists refugio_cercano_id uuid references public.refugios(id);

-- 3. Migrar lo que ya está: las mascotas que recibieron un refugio por
--    cercanía (no publicadas desde el panel del refugio) pasan a
--    refugio_cercano_id y liberan refugio_id.
--    Se identifican porque NO tienen contact_email y su refugio no las creó:
--    revisa el resultado del SELECT antes de correr el UPDATE.
select m.id, m.name, m.refugio_id, r.nombre as refugio
from public.mascotas m
join public.refugios r on r.id = m.refugio_id
order by m.id;

-- Si en la lista de arriba hay mascotas que el refugio NO publicó él mismo,
-- muévelas con este UPDATE (ajusta los ids según lo que hayas visto):
-- update public.mascotas
-- set refugio_cercano_id = refugio_id, refugio_id = null
-- where id in ( /* ids aquí */ );
