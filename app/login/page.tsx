'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/');
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <main className="min-h-screen bg-[#1a1a2e] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
        <div className="text-5xl mb-4">🐾</div>
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">PetMatch</h1>
        <p className="text-gray-400 text-sm mb-8">Sitio en modo privado. Ingresa la contraseña para continuar.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Contraseña"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 text-center tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm">Contraseña incorrecta</p>
          )}
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
