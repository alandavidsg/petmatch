'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';

type Pet = {
  id: number;
  name: string;
  type: string;
  breed: string;
  image: string;
  location: string;
  urgente: boolean;
  lat: number | null;
  lng: number | null;
};

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center text-gray-400">
        <div className="animate-bounce text-4xl mb-3">🗺️</div>
        <p className="text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
});

export default function MapaPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('todos');

  useEffect(() => {
    async function fetchPets() {
      const { data, error } = await supabase
        .from('mascotas')
        .select('id, name, type, breed, image, location, urgente, lat, lng')
        .eq('available', true);

      if (!error && data) setPets(data);
      setLoading(false);
    }
    fetchPets();
  }, []);

  const petsWithCoords = pets.filter((p) => p.lat != null && p.lng != null);

  const filteredPets =
    selectedType === 'todos'
      ? petsWithCoords
      : petsWithCoords.filter((p) => p.type === selectedType);

  const types = ['todos', ...Array.from(new Set(petsWithCoords.map((p) => p.type)))];

  return (
    <main className="min-h-screen bg-gray-50" suppressHydrationWarning>
      {/* Header */}
      <div className="bg-[#1a1a2e] px-8 py-8 text-center">
        <h1 className="text-white text-3xl font-semibold mb-2">Mapa de mascotas</h1>
        <p className="text-white/50 text-sm">
          {loading ? 'Cargando...' : `${petsWithCoords.length} mascota${petsWithCoords.length !== 1 ? 's' : ''} con ubicación`}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filtros */}
        {!loading && petsWithCoords.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-4 py-1.5 rounded-full text-sm border transition capitalize ${
                  selectedType === t
                    ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                    : 'border-gray-200 text-gray-500 hover:bg-[#1a1a2e] hover:text-white hover:border-[#1a1a2e]'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100" style={{ height: '520px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center text-gray-400">
                <div className="animate-bounce text-4xl mb-3">🐾</div>
                <p className="text-sm">Cargando mascotas...</p>
              </div>
            </div>
          ) : petsWithCoords.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center text-gray-400 px-8">
                <div className="text-5xl mb-4">🗺️</div>
                <p className="font-medium text-gray-500 mb-2">Aún no hay mascotas en el mapa</p>
                <p className="text-sm">Las mascotas aparecerán aquí cuando se reporte su ubicación exacta.</p>
                <a href="/reportar" className="inline-block mt-5 bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition">
                  Reportar mascota
                </a>
              </div>
            </div>
          ) : (
            <MapClient pets={filteredPets} />
          )}
        </div>

        {/* Lista de mascotas sin coordenadas */}
        {!loading && pets.length > petsWithCoords.length && (
          <div className="mt-6 bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <p className="text-orange-600 font-medium text-sm mb-1">
              {pets.length - petsWithCoords.length} mascota{pets.length - petsWithCoords.length !== 1 ? 's' : ''} sin ubicación exacta
            </p>
            <p className="text-orange-400 text-xs">
              Solo se muestran en el mapa las mascotas reportadas con GPS activado.
            </p>
          </div>
        )}

        {/* Cards de mascotas con coords */}
        {!loading && filteredPets.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Mascotas en el mapa</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredPets.map((pet) => (
                <a
                  key={pet.id}
                  href={`/mascota/${pet.id}`}
                  className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-orange-300 hover:shadow-md transition"
                >
                  <div className="relative">
                    <img src={pet.image} alt={pet.name} className="h-28 w-full object-cover" />
                    {pet.urgente && (
                      <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        🚨 URGENTE
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-[#1a1a2e] text-sm">{pet.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{pet.breed}</div>
                    <div className="text-xs text-gray-400 mt-1 truncate">📍 {pet.location}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
