'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Phone, Mail, CheckCircle, XCircle, Clock, PawPrint, Home, Building2, User } from 'lucide-react';

type Solicitud = {
  id: string;
  nombre_adoptante: string;
  tipo?: string;
  email_adoptante: string;
  telefono_adoptante: string | null;
  mensaje: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  created_at: string;
  mascota_id: number | null;
  refugio_id: string | null;
  mascotas: {
    name: string;
    image: string;
    contact_nombre: string | null;
    contact_email: string | null;
    contact_telefono: string | null;
  } | null;
  refugios: { nombre: string; email: string } | null;
};

const estadoConfig = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-500', icon: XCircle },
};

const SIN_REFUGIO = 'sin-refugio';

export default function AdminSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAuth, setNoAuth] = useState(false);

  useEffect(() => {
    fetch('/api/admin/solicitudes')
      .then(async (res) => {
        if (res.status === 401) {
          setNoAuth(true);
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      })
      .then(setSolicitudes)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <PawPrint size={36} className="text-orange-300 animate-bounce" />
      </div>
    );
  }

  if (noAuth) {
    return (
      <div className="max-w-md mx-auto text-center py-32 px-6">
        <p className="text-gray-500 text-sm mb-4">Necesitas iniciar sesión para ver esta página.</p>
        <Link href="/login" className="text-orange-500 text-sm font-medium hover:underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  // Agrupa por refugio; las mascotas publicadas por particulares van en su propio grupo
  const grupos = new Map<string, { nombre: string; email: string | null; items: Solicitud[] }>();
  for (const s of solicitudes) {
    const key = s.refugio_id ?? SIN_REFUGIO;
    if (!grupos.has(key)) {
      grupos.set(key, {
        nombre: s.refugios?.nombre ?? 'Publicadas por particulares',
        email: s.refugios?.email ?? null,
        items: [],
      });
    }
    grupos.get(key)!.items.push(s);
  }

  // Los particulares al final, el resto por cantidad de solicitudes
  const gruposOrdenados = [...grupos.entries()].sort(([a], [b]) => {
    if (a === SIN_REFUGIO) return 1;
    if (b === SIN_REFUGIO) return -1;
    return grupos.get(b)!.items.length - grupos.get(a)!.items.length;
  });

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Todas las solicitudes</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {pendientes} pendiente{pendientes !== 1 ? 's' : ''} de {solicitudes.length} total
          {solicitudes.length !== 1 ? 'es' : ''} · {gruposOrdenados.length} grupo
          {gruposOrdenados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {solicitudes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <MessageSquare size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Todavía no hay solicitudes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {gruposOrdenados.map(([key, grupo]) => (
            <section key={key}>
              <div className="flex items-center gap-2 mb-3 px-1">
                {key === SIN_REFUGIO ? (
                  <User size={16} className="text-gray-400 shrink-0" />
                ) : (
                  <Building2 size={16} className="text-orange-500 shrink-0" />
                )}
                <h2 className="font-semibold text-[#1a1a2e] text-sm">{grupo.nombre}</h2>
                <span className="text-xs text-gray-400">
                  {grupo.items.length} solicitud{grupo.items.length !== 1 ? 'es' : ''}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {grupo.items.map((s) => {
                  const cfg = estadoConfig[s.estado];
                  const EstadoIcon = cfg.icon;
                  // A quién le llegó el aviso de esta solicitud
                  const destinatario =
                    key === SIN_REFUGIO
                      ? s.mascotas?.contact_email ?? null
                      : grupo.email;

                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start gap-3">
                        {s.mascotas?.image && (
                          <img
                            src={s.mascotas.image}
                            alt={s.mascotas.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              {s.mascota_id ? (
                                <Link
                                  href={`/mascota/${s.mascota_id}`}
                                  className="font-semibold text-[#1a1a2e] text-sm hover:text-orange-500 transition"
                                >
                                  {s.mascotas?.name ?? 'Mascota'}
                                </Link>
                              ) : (
                                <span className="font-semibold text-[#1a1a2e] text-sm">
                                  {s.mascotas?.name ?? 'Mascota'}
                                </span>
                              )}
                              <span className="text-gray-400 text-xs ml-2">
                                {new Date(s.created_at).toLocaleDateString('es-CL', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                                  s.tipo === 'hogar_temporal'
                                    ? 'bg-sky-50 text-sky-600'
                                    : 'bg-orange-50 text-orange-500'
                                }`}
                              >
                                {s.tipo === 'hogar_temporal' && <Home size={11} />}
                                {s.tipo === 'hogar_temporal' ? 'Hogar temporal' : 'Adopción'}
                              </span>
                              <span
                                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}
                              >
                                <EstadoIcon size={11} /> {cfg.label}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-col gap-1">
                            <p className="text-sm font-medium text-[#1a1a2e]">{s.nombre_adoptante}</p>
                            <div className="flex flex-wrap gap-3">
                              <a
                                href={`mailto:${s.email_adoptante}`}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition"
                              >
                                <Mail size={12} /> {s.email_adoptante}
                              </a>
                              {s.telefono_adoptante && (
                                <a
                                  href={`tel:${s.telefono_adoptante}`}
                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition"
                                >
                                  <Phone size={12} /> {s.telefono_adoptante}
                                </a>
                              )}
                            </div>
                            {s.mensaje && (
                              <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{s.mensaje}&rdquo;</p>
                            )}
                          </div>

                          <p className="text-xs text-gray-400 mt-2.5 pt-2.5 border-t border-gray-50">
                            {destinatario ? (
                              <>Aviso enviado a <span className="text-gray-500">{destinatario}</span></>
                            ) : (
                              <span className="text-red-500">
                                Sin destinatario: nadie recibió aviso de esta solicitud
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
