export default function Hero() {
  return (
    <section className="bg-[#1a1a2e] px-6 py-16 text-center">
      <h1 className="text-white text-4xl font-semibold mb-4">
        Encuentra tu compañero ideal
      </h1>
      <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
        Mascotas de la calle que necesitan un hogar. Reporta, adopta y cambia vidas.
      </p>
      <a
        href="/reportar"
        className="bg-orange-500 text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-orange-600 transition inline-block"
      >
        📸 Reportar mascota
      </a>

      <div className="grid grid-cols-3 gap-4 mt-12 max-w-sm mx-auto">
        {[
          { num: '127', label: 'Reportadas' },
          { num: '89', label: 'Adoptadas' },
          { num: '38', label: 'Disponibles' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-orange-500 text-2xl font-semibold">{s.num}</div>
            <div className="text-white/50 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}