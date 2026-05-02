'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const amounts = [1000, 2000, 5000, 10000, 20000];

export default function DonarPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(5000);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finalAmount = custom ? parseInt(custom.replace(/\D/g, '')) : selected;

  const handlePagar = async () => {
    if (!finalAmount) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        setError(data.error ?? 'No se pudo iniciar el pago. Intenta de nuevo.');
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto px-6 py-10">

        <button onClick={() => router.back()} className="text-gray-400 text-sm mb-6 flex items-center gap-1">
          ← Volver
        </button>

        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🐾</div>
          <h1 className="text-2xl font-semibold text-[#1a1a2e] mb-2">Apoya nuestra causa</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            Cada peso ayuda a rescatar, alimentar y encontrar hogar para mascotas callejeras.
          </p>
        </div>

        {/* Impacto */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '🍖', amount: '$1.000', label: 'Un día de comida' },
            { icon: '💉', amount: '$5.000', label: 'Vacuna básica' },
            { icon: '🏥', amount: '$10.000', label: 'Consulta veterinaria' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl p-4 text-center border border-gray-100">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-orange-500 font-semibold text-sm">{item.amount}</div>
              <div className="text-gray-400 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Selector de monto */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <p className="text-sm font-medium text-[#1a1a2e] mb-4">Elige un monto</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {amounts.map((a) => (
              <button
                key={a}
                onClick={() => { setSelected(a); setCustom(''); }}
                className={`py-3 rounded-xl text-sm font-medium border transition ${
                  selected === a && !custom
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-200 text-gray-600 hover:border-orange-400'
                }`}
              >
                ${a.toLocaleString('es-CL')}
              </button>
            ))}
            <button
              onClick={() => { setSelected(null); }}
              className={`py-3 rounded-xl text-sm font-medium border transition ${
                custom ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-400'
              }`}
            >
              Otro
            </button>
          </div>
          {(selected === null || custom) && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                placeholder="Ingresa el monto"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="w-full pl-7 pr-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
                style={{ fontSize: '16px' }}
              />
            </div>
          )}
        </div>

        {/* Mercado Pago */}
        {error && (
          <p className="text-red-500 text-sm text-center mb-3">{error}</p>
        )}
        <button
          onClick={handlePagar}
          disabled={!finalAmount || loading}
          className="w-full bg-[#009ee3] hover:bg-[#0080be] disabled:opacity-50 text-white py-4 rounded-xl font-medium transition flex items-center justify-center gap-2 mb-4"
        >
          {loading ? (
            <>
              <span className="animate-spin text-lg">⏳</span>
              Redirigiendo...
            </>
          ) : (
            <>
              <span className="text-lg">💳</span>
              Pagar con Mercado Pago
              {finalAmount ? ` — $${finalAmount.toLocaleString('es-CL')}` : ''}
            </>
          )}
        </button>

        {/* Transferencia */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm font-medium text-[#1a1a2e] mb-4 flex items-center gap-2">
            🏦 Transferencia bancaria
          </p>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Banco', value: '—' },
              { label: 'Tipo de cuenta', value: '—' },
              { label: 'Número', value: '—' },
              { label: 'RUT', value: '—' },
              { label: 'Nombre', value: '—' },
              { label: 'Email', value: '—' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-gray-400">{row.label}</span>
                <span className="text-[#1a1a2e] font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Envía el comprobante a <span className="text-orange-500">donaciones@petmatch.cl</span>
          </p>
        </div>

      </div>
    </main>
  );
}
