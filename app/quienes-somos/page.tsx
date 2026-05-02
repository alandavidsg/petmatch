export default function QuienesSomos() {
  return (
    <main className="min-h-screen bg-gray-50">
      

      <section className="bg-[#1a1a2e] px-8 py-20 text-center">
        <h1 className="text-white text-4xl font-semibold mb-4">Quienes somos</h1>
        <p className="text-white/50 text-base max-w-md mx-auto">
          Un equipo apasionado por el bienestar animal en Chile
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 py-16">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-4">Nuestra mision</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            PetMatch nacio con el objetivo de reducir la cantidad de mascotas en situacion de calle en Chile. 
            Usamos tecnologia e inteligencia artificial para facilitar el proceso de reporte y adopcion, 
            conectando a personas que quieren ayudar con mascotas que necesitan un hogar.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-4">Como funciona</h2>
          <div className="flex flex-col gap-4">
            {[
              { num: '01', title: 'Reporta', desc: 'Saca una foto de una mascota en la calle. La IA detecta automaticamente su especie, raza y edad.' },
              { num: '02', title: 'Se publica', desc: 'La mascota aparece en el catalogo con su ubicacion exacta para que otros puedan verla.' },
              { num: '03', title: 'Adopta', desc: 'Cualquier persona puede solicitar la adopcion completando un formulario simple.' },
            ].map((s) => (
              <div key={s.num} className="flex gap-4 items-start">
                <div className="bg-orange-50 text-orange-500 font-semibold text-sm px-3 py-1.5 rounded-lg min-w-fit">
                  {s.num}
                </div>
                <div>
                  <div className="font-medium text-[#1a1a2e] text-sm mb-1">{s.title}</div>
                  <div className="text-gray-400 text-sm leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { num: '127', label: 'Mascotas reportadas' },
            { num: '89', label: 'Adoptadas exitosamente' },
            { num: '500+', label: 'Usuarios activos' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <div className="text-orange-500 text-3xl font-semibold">{s.num}</div>
              <div className="text-gray-400 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

    
    </main>
  );
}