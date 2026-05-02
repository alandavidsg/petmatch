export default function Navbar() {
  return (
    <nav className="bg-[#1a1a2e] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="text-white text-xl font-semibold">
        Pet<span className="text-orange-500">Match</span>
      </div>
      <div className="flex gap-3">
        <a href="/" className="text-white/70 hover:text-white text-sm transition">Catálogo</a>
        <a href="/reportar" className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-orange-600 transition">
          📸 Reportar
        </a>
      </div>
    </nav>
  );
}