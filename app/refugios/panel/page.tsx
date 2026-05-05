'use client';

import { useEffect, useState } from 'react';
import { usePanelContext } from './layout';
import { PawPrint, Heart, MessageSquare, Plus, TrendingUp, Sparkles } from 'lucide-react';

type Stats = {
  total: number;
  disponibles: number;
  adoptadas: number;
  pendientes: number;
};

export default function PanelDashboard() {
  const { refugio, token } = usePanelContext();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/refugios/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setStats);
  }, [token]);

  const cards = [
    {
      label: 'Mascotas publicadas',
      value: stats?.total ?? '—',
      icon: <PawPrint size={20} className="text-orange-500" />,
      bg: 'bg-orange-50',
    },
    {
      label: 'Disponibles',
      value: stats?.disponibles ?? '—',
      icon: <Heart size={20} className="text-green-500" />,
      bg: 'bg-green-50',
    },
    {
      label: 'Adoptadas',
      value: stats?.adoptadas ?? '—',
      icon: <TrendingUp size={20} className="text-blue-500" />,
      bg: 'bg-blue-50',
    },
    {
      label: 'Solicitudes pendientes',
      value: stats?.pendientes ?? '—',
      icon: <MessageSquare size={20} className="text-purple-500" />,
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
          Hola, {refugio?.nombre} <Sparkles size={22} className="text-orange-400" />
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {refugio?.region ? `${refugio.region} · ` : ''}Resumen de tu refugio
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-[#1a1a2e]">{card.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Acciones rápidas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="/refugios/panel/mascotas/nueva"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-orange-300 hover:shadow-md transition"
        >
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
            <Plus size={22} className="text-orange-500" />
          </div>
          <div>
            <div className="font-semibold text-[#1a1a2e]">Publicar mascota</div>
            <div className="text-xs text-gray-400 mt-0.5">Agrega una nueva mascota al catálogo</div>
          </div>
        </a>
        <a
          href="/refugios/panel/solicitudes"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-orange-300 hover:shadow-md transition"
        >
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare size={22} className="text-purple-500" />
          </div>
          <div>
            <div className="font-semibold text-[#1a1a2e]">Ver solicitudes</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {stats?.pendientes ? `${stats.pendientes} pendiente${stats.pendientes !== 1 ? 's' : ''}` : 'Gestiona las solicitudes de adopción'}
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
