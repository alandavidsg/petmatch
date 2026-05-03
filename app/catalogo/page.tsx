'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { MapPin, Heart, AlertTriangle, PawPrint } from 'lucide-react';

type Pet = {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: string;
  location: string;
  image: string;
  urgente: boolean;
};

const filters = [
  { label: 'Todos', value: 'todos' },
  { label: 'Perros', value: 'Perro' },
  { label: 'Gatos', value: 'Gato' },
  { label: 'Pájaros', value: 'Pájaro' },
  { label: 'Conejos', value: 'Conejo' },
  { label: 'Urgente', value: 'urgente' },
  { label: 'Otros', value: 'Animal' },
  { label: '❤️ Favoritos', value: 'favoritos' },
];

function CatalogoContent() {
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get('tipo') || 'todos';

  const [activeFilter, setActiveFilter] = useState(tipoParam);
  const [activeCityFilter, setActiveCityFilter] = useState('todas');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('petmatch_favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    setActiveFilter(tipoParam);
  }, [tipoParam]);

  useEffect(() => {
    async function fetchPets() {
      const { data, error } = await supabase
        .from('mascotas')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false });

      if (!error && data) setPets(data);
      setLoading(false);
    }
    fetchPets();
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem('petmatch_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const regionCiudades: Record<string, string[]> = {
    'Arica y Parinacota': ['Arica', 'Putre', 'General Lagos', 'Camarones'],
    'Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Huara', 'Colchane', 'Camiña', 'Pica'],
    'Antofagasta': ['Antofagasta', 'Calama', 'Tocopilla', 'Mejillones', 'Sierra Gorda', 'Taltal', 'María Elena', 'San Pedro de Atacama', 'Ollagüe'],
    'Atacama': ['Copiapó', 'Vallenar', 'Chañaral', 'Diego de Almagro', 'Huasco', 'Freirina', 'Tierra Amarilla', 'Caldera', 'Alto del Carmen'],
    'Coquimbo': ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Los Vilos', 'Salamanca', 'Vicuña', 'Paihuano', 'Andacollo', 'Monte Patria', 'Río Hurtado', 'Canela', 'Combarbalá'],
    'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio', 'Quillota', 'Los Andes', 'San Felipe', 'Limache', 'Olmué', 'Casablanca', 'Cartagena', 'El Quisco', 'El Tabo', 'Algarrobo', 'Santo Domingo', 'Nogales', 'Calera', 'La Cruz', 'Hijuelas', 'Putaendo', 'Santa María', 'Cabildo', 'Petorca', 'La Ligua', 'Zapallar', 'Papudo', 'Puchuncaví', 'Quintero', 'Concón', 'Juan Fernández'],
    'Metropolitana': ['Santiago', 'Maipú', 'Las Condes', 'Providencia', 'Ñuñoa', 'Pudahuel', 'La Florida', 'Puente Alto', 'San Bernardo', 'Quilicura', 'Peñalolén', 'La Pintana', 'Lo Barnechea', 'Macul', 'La Granja', 'El Bosque', 'Estación Central', 'Independencia', 'Recoleta', 'Cerro Navia', 'Renca', 'Conchalí', 'Huechuraba', 'Lo Espejo', 'Lo Prado', 'Pedro Aguirre Cerda', 'San Joaquín', 'San Miguel', 'San Ramón', 'Vitacura', 'Cerrillos', 'Talagante', 'Melipilla', 'Buin', 'Colina', 'Lampa', 'Tiltil', 'Pirque', 'San José de Maipo', 'Calera de Tango', 'El Monte', 'Isla de Maipo', 'Padre Hurtado', 'Peñaflor'],
    "O'Higgins": ['Rancagua', 'San Fernando', 'Pichilemu', 'Rengo', 'Machalí', 'Graneros', 'Mostazal', 'Codegua', 'Coinco', 'Coltauco', 'Doñihue', 'Las Cabras', 'Peumo', 'Pichidegua', 'Quinta de Tilcoco', 'San Vicente', 'Chimbarongo', 'Nancagua', 'Placilla', 'Santa Cruz', 'Palmilla', 'Lolol', 'Peralillo', 'Pumanque', 'Marchigüe', 'Paredones', 'Litueche', 'La Estrella', 'Navidad', 'Pichilemu', 'Requínoa', 'Olivar', 'Malloa'],
    'Maule': ['Talca', 'Curicó', 'Linares', 'Cauquenes', 'Constitución', 'Molina', 'San Clemente', 'Pelarco', 'Río Claro', 'San Rafael', 'Pencahue', 'Maule', 'Curepto', 'Rauco', 'Romeral', 'Sagrada Familia', 'Teno', 'Vichuquén', 'Hualañé', 'Licantén', 'Colbún', 'Longaví', 'Villa Alegre', 'Yerbas Buenas', 'San Javier', 'Retiro', 'Parral', 'Chanco', 'Pelluhue', 'Empedrado'],
    'Ñuble': ['Chillán', 'San Carlos', 'Bulnes', 'Quirihue', 'Chillán Viejo', 'Cobquecura', 'Coelemu', 'Coihueco', 'El Carmen', 'Ninhue', 'Ñiquén', 'Pemuco', 'Pinto', 'Portezuelo', 'Quillón', 'Ránquil', 'San Fabián', 'San Ignacio', 'San Nicolás', 'Treguaco', 'Yungay'],
    'Biobío': ['Concepción', 'Talcahuano', 'Los Ángeles', 'Chiguayante', 'San Pedro de la Paz', 'Coronel', 'Lota', 'Hualpén', 'Tomé', 'Penco', 'Lebu', 'Arauco', 'Curanilahue', 'Los Álamos', 'Cañete', 'Contulmo', 'Tirúa', 'Hualqui', 'Santa Juana', 'Florida', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Antuco', 'Alto Biobío'],
    'La Araucanía': ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Victoria', 'Lautaro', 'Pitrufquén', 'Gorbea', 'Loncoche', 'Cunco', 'Melipeuco', 'Curarrehue', 'Freire', 'Toltén', 'Teodoro Schmidt', 'Saavedra', 'Carahue', 'Nueva Imperial', 'Galvarino', 'Perquenco', 'Lumaco', 'Traiguén', 'Ercilla', 'Collipulli', 'Renaico', 'Purén', 'Los Sauces', 'Curacautín', 'Lonquimay', 'Vilcún', 'Cholchol'],
    'Los Ríos': ['Valdivia', 'La Unión', 'Río Bueno', 'Futrono', 'Lago Ranco', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli', 'Corral'],
    'Los Lagos': ['Puerto Montt', 'Osorno', 'Puerto Varas', 'Castro', 'Ancud', 'Calbuco', 'Quellón', 'Maullín', 'Los Muermos', 'Llanquihue', 'Fresia', 'Frutillar', 'Puerto Octay', 'Purranque', 'Río Negro', 'San Juan de la Costa', 'Puyehue', 'Lago Ranco', 'Hualaihué', 'Chaitén', 'Futaleufú', 'Palena', 'Quemchi', 'Dalcahue', 'Curaco de Vélez', 'Quinchao', 'Puqueldón', 'Chonchi'],
    'Aysén': ['Coyhaique', 'Aysén', 'Chile Chico', 'Cochrane', 'O\'Higgins', 'Tortel', 'Cisnes', 'Guaitecas', 'Lago Verde', 'Río Ibáñez'],
    'Magallanes': ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Puerto Williams', 'Primavera', 'Timaukel', 'Laguna Blanca', 'Río Verde', 'San Gregorio', 'Cabo de Hornos'],
  };

  const regiones = Object.keys(regionCiudades);

  const byType = activeFilter === 'todos'
    ? pets
    : activeFilter === 'favoritos'
    ? pets.filter((p) => favorites.includes(p.id))
    : activeFilter === 'urgente'
    ? pets.filter((p) => p.urgente)
    : pets.filter((p) => p.type === activeFilter);

  const filteredPets = activeCityFilter === 'todas'
    ? byType
    : byType.filter((p) => {
        const loc = p.location?.toLowerCase() ?? '';
        return regionCiudades[activeCityFilter]?.some((ciudad) =>
          loc.includes(ciudad.toLowerCase())
        );
      });

  const categoryTitles: Record<string, string> = {
    todos: 'Todas las mascotas',
    Perro: 'Perros en adopción',
    Gato: 'Gatos en adopción',
    Pájaro: 'Pájaros en adopción',
    Conejo: 'Conejos en adopción',
    urgente: 'Adopción urgente',
    Animal: 'Animales exóticos en adopción',
    favoritos: '❤️ Mis favoritos',
  };
  const activeLabel = categoryTitles[activeFilter] || 'Todas las mascotas';

  return (
    <main className="min-h-screen bg-gray-50" suppressHydrationWarning>
      <div className="bg-[#1a1a2e] px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-white text-3xl font-semibold mb-1" suppressHydrationWarning>{activeLabel}</h1>
          <p className="text-white/40 text-sm">
            {loading ? 'Cargando...' : `${filteredPets.length} mascota${filteredPets.length !== 1 ? 's' : ''} disponible${filteredPets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Filtro por región */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-sm text-gray-400 flex-shrink-0 flex items-center gap-1"><MapPin size={14} /> Región:</span>
          <select
            value={activeCityFilter}
            onChange={(e) => setActiveCityFilter(e.target.value)}
            className="px-4 py-2 rounded-full text-sm border border-gray-200 text-gray-500 bg-white focus:outline-none focus:border-[#1a1a2e] cursor-pointer"
          >
            <option value="todas">Todas las regiones</option>
            {regiones.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="flex justify-center mb-4"><PawPrint size={48} className="text-orange-300 animate-bounce" /></div>
            <p>Cargando mascotas...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {filteredPets.map((pet) => (
                <a key={pet.id} href={`/mascota/${pet.id}`} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-300 hover:shadow-lg transition block">
                  <div className="relative">
                    <img src={pet.image} alt={pet.name} className="h-44 w-full object-cover" />
                    {pet.urgente && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle size={10} /> URGENTE
                      </span>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(e, pet.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:scale-110 transition"
                    >
                      <Heart size={16} className={favorites.includes(pet.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-[#1a1a2e] text-base">{pet.name}</div>
                    <div className="text-sm text-gray-400 mt-1">{pet.breed} · {pet.age}</div>
                    <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><MapPin size={11} />{pet.location}</div>
                    <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-500 font-medium">
                      {pet.type}
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {filteredPets.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="flex justify-center mb-4"><PawPrint size={48} className="text-gray-300" /></div>
                <p>No hay mascotas con estos filtros</p>
                {(activeFilter !== 'todos' || activeCityFilter !== 'todas') && (
                  <button
                    onClick={() => { setActiveFilter('todos'); setActiveCityFilter('todas'); }}
                    className="mt-4 text-orange-500 text-sm underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400"><div className="flex justify-center mb-4"><PawPrint size={48} className="text-orange-300 animate-bounce" /></div><p>Cargando...</p></div>}>
      <CatalogoContent />
    </Suspense>
  );
}
