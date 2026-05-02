const pets = [
  { id: 1, name: 'Luna', type: 'Gato', breed: 'Siamesa', age: '3 años', location: 'Providencia, Santiago', emoji: '🐱' },
  { id: 2, name: 'Toby', type: 'Perro', breed: 'Labrador mix', age: '1 año', location: 'Parque Bustamante', emoji: '🐶' },
  { id: 3, name: 'Michi', type: 'Gato', breed: 'Común europeo', age: '4 años', location: 'Bellavista', emoji: '🐈' },
  { id: 4, name: 'Rocky', type: 'Perro', breed: 'Mestizo', age: '2 años', location: 'Ñuñoa, Santiago', emoji: '🐕' },
  { id: 5, name: 'Cleo', type: 'Gato', breed: 'Angora', age: '1 año', location: 'Las Condes', emoji: '😺' },
  { id: 6, name: 'Rex', type: 'Perro', breed: 'Pastor mix', age: '3 años', location: 'Maipú, Santiago', emoji: '🦮' },
];

export default function Catalog() {
  return (
    <section className="px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[#1a1a2e]">Mascotas disponibles</h2>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['Todos', 'Perros', 'Gatos'].map((f) => (
          <button
            key={f}
            className="px-4 py-1.5 rounded-full text-sm border border-gray-200 hover:bg-[#1a1a2e] hover:text-white transition"
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {pets.map((pet) => (
          <div
            key={pet.id}
            className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-200 hover:shadow-md transition cursor-pointer"
          >
            <div className="h-36 bg-orange-50 flex items-center justify-center text-6xl">
              {pet.emoji}
            </div>
            <div className="p-4">
              <div className="font-medium text-[#1a1a2e]">{pet.name}</div>
              <div className="text-sm text-gray-400 mt-0.5">{pet.breed} · {pet.age}</div>
              <div className="text-xs text-gray-400 mt-2">📍 {pet.location}</div>
              <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
                {pet.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}