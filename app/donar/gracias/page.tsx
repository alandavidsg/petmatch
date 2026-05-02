'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function GraciasContent() {
  const params = useSearchParams();
  const status = params.get('status') ?? params.get('collection_status');
  const isPending = status === 'pending' || status === 'in_process';

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-7xl mb-6">{isPending ? '⏳' : '🐾'}</div>
        <h1 className="text-2xl font-semibold text-[#1a1a2e] mb-3">
          {isPending ? 'Pago en proceso' : '¡Gracias por tu donación!'}
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          {isPending
            ? 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'
            : 'Tu aporte ayuda a rescatar, alimentar y encontrar hogar para mascotas callejeras. ¡Gracias por marcar la diferencia!'}
        </p>
        <Link
          href="/"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-8 rounded-xl transition"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

export default function GraciasPage() {
  return (
    <Suspense>
      <GraciasContent />
    </Suspense>
  );
}
