'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

type Estado = { total: number; pendientes: number };
type Procesada = { id: number; name: string; ok: boolean };

export default function AdminCatalogo() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const [log, setLog] = useState<Procesada[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargarEstado = async () => {
    const res = await fetch('/api/admin/describir-catalogo');
    if (res.status === 401) { setError('No autorizado. Entra primero por /login.'); return; }
    setEstado(await res.json());
  };

  useEffect(() => { cargarEstado(); }, []);

  // Procesa de a lotes chicos hasta que no queden pendientes. El endpoint hace 4
  // por llamada para no pasarse del límite de Groq; el loop vive acá para poder
  // mostrar avance y poder cortarlo cerrando la página.
  const describirTodo = async () => {
    setCorriendo(true);
    setError(null);
    setLog([]);
    try {
      for (;;) {
        const res = await fetch('/api/admin/describir-catalogo', { method: 'POST' });
        if (!res.ok) { setError('Error al procesar. Revisa la consola de Vercel.'); break; }
        const data = await res.json();
        setLog((prev) => [...prev, ...data.procesadas]);
        setEstado((prev) => (prev ? { ...prev, pendientes: data.restantes } : prev));
        if (data.procesadas.length === 0 || data.restantes === 0) break;
        // Si el lote entero falló, no seguir en loop infinito quemando cuota.
        if (data.exitosas === 0) { setError('El lote falló completo — probablemente se agotó la cuota diaria de Groq. Reintenta más tarde.'); break; }
      }
    } catch {
      setError('Error de red al procesar.');
    }
    setCorriendo(false);
  };

  const fallidas = log.filter((p) => !p.ok).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-[#1a1a2e]">Descripciones del catálogo</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        La búsqueda de mascotas perdidas compara descripciones de texto. Una mascota sin
        descripción no puede aparecer en ningún resultado.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 text-red-600 text-sm rounded-xl p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {estado && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1a1a2e]">{estado.total - estado.pendientes}</span>
            <span className="text-gray-400">de {estado.total} descritas</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${estado.total ? ((estado.total - estado.pendientes) / estado.total) * 100 : 0}%` }}
            />
          </div>
          {estado.pendientes > 0 ? (
            <p className="text-sm text-gray-500 mt-3">
              Faltan <b>{estado.pendientes}</b> — esas mascotas hoy son invisibles para la búsqueda.
            </p>
          ) : (
            <p className="text-sm text-green-600 mt-3 flex items-center gap-1.5">
              <CheckCircle size={14} /> Todo el catálogo está descrito.
            </p>
          )}
        </div>
      )}

      <button
        onClick={describirTodo}
        disabled={corriendo || !estado || estado.pendientes === 0}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
      >
        {corriendo
          ? <><Loader2 size={18} className="animate-spin" /> Describiendo… ({log.length} listas)</>
          : <><Sparkles size={18} /> Describir las que faltan</>}
      </button>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Va de a 4 por vez para no pasarse del límite de Groq. Puede tardar varios minutos — no cierres la página.
      </p>

      {log.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-2">
            Procesadas: {log.length}{fallidas > 0 && ` (${fallidas} fallaron)`}
          </h2>
          <div className="flex flex-col gap-1">
            {log.map((p, i) => (
              <div key={`${p.id}-${i}`} className="flex items-center gap-2 text-xs text-gray-500">
                {p.ok
                  ? <CheckCircle size={12} className="text-green-500 shrink-0" />
                  : <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                <span className="text-gray-400">#{p.id}</span> {p.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
