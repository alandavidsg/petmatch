  import type { Metadata } from 'next';
  import './globals.css';
  import { Camera, PawPrint, Map, Search, BookOpen, Heart } from 'lucide-react';

  export const metadata: Metadata = {
    title: 'PetMatch - Adopta una mascota',
    description: 'Conectando mascotas de la calle con hogares llenos de amor en Chile',
  };

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="es">
        <body className="pb-16 md:pb-0">
          {/* Top bar — solo desktop */}
          <div className="hidden md:flex bg-[#12122a] px-8 py-2 items-center justify-between text-xs text-white/40">
            <span>Ayudando a mascotas desde 2026</span>
            <div className="flex gap-4">
              <a href="/quienes-somos" className="hover:text-white transition">Quiénes somos</a>
              <a href="/faq" className="hover:text-white transition">FAQ</a>
              <a href="/contacto" className="hover:text-white transition">Contacto</a>
            </div>
          </div>

          {/* Navbar desktop */}
          <nav className="bg-[#1a1a2e] px-6 md:px-8 py-4 flex items-center justify-between">
            <a href="/" className="text-white text-xl font-semibold tracking-tight flex items-center gap-1.5">
              <PawPrint size={20} className="text-orange-500" />
              Pet<span className="text-orange-500">Match</span>
            </a>
            {/* Links solo en desktop */}
            <div className="hidden md:flex items-center gap-4">
              <a href="/catalogo" className="text-white/60 hover:text-white text-sm transition">Catálogo</a>
              <a href="/mapa" className="text-white/60 hover:text-white text-sm transition flex items-center gap-1"><Map size={14} />Mapa</a>
              <a href="/perdidos" className="text-white/60 hover:text-white text-sm transition flex items-center gap-1"><Search size={14} />Perdidos</a>
              <a href="/reportar" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><Camera size={15} />Reportar</a>
            </div>
            {/* Botón reportar en móvil */}
            <a href="/reportar" className="md:hidden bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
              <Camera size={15} />Reportar
            </a>
          </nav>

          {children}

          <footer className="bg-[#1a1a2e] mt-8">
            <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-white text-lg font-semibold mb-3 flex items-center gap-1.5"><PawPrint size={18} className="text-orange-500" />Pet<span className="text-orange-500">Match</span></div>
                <p className="text-white/40 text-sm leading-relaxed">Conectando mascotas de la calle con hogares llenos de amor en Chile.</p>
              </div>
              <div>
                <div className="text-white text-sm font-medium mb-3">Enlaces</div>
                <div className="flex flex-col gap-2">
                  <a href="/catalogo" className="text-white/40 hover:text-white text-sm transition">Catálogo</a>
                  <a href="/mapa" className="text-white/40 hover:text-white text-sm transition">Mapa</a>
                  <a href="/perdidos" className="text-white/40 hover:text-white text-sm transition">Mascotas perdidas</a>
                  <a href="/reportar" className="text-white/40 hover:text-white text-sm transition">Reportar mascota</a>
                  <a href="/quienes-somos" className="text-white/40 hover:text-white text-sm transition">Quiénes somos</a>
                  <a href="/faq" className="text-white/40 hover:text-white text-sm transition">Preguntas frecuentes</a>
                  <a href="/contacto" className="text-white/40 hover:text-white text-sm transition">Contacto</a>
                </div>
              </div>
              <div>
                <div className="text-white text-sm font-medium mb-3">Redes sociales</div>
                <div className="flex flex-col gap-2">
                  <a href="https://instagram.com" target="_blank" className="text-white/40 hover:text-white text-sm transition">Instagram</a>
                  <a href="https://facebook.com" target="_blank" className="text-white/40 hover:text-white text-sm transition">Facebook</a>
                  <a href="https://tiktok.com" target="_blank" className="text-white/40 hover:text-white text-sm transition">TikTok</a>
                  <a href="https://twitter.com" target="_blank" className="text-white/40 hover:text-white text-sm transition">X / Twitter</a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 px-8 py-4 text-center text-white/20 text-xs">
              2026 PetMatch · Todos los derechos reservados
            </div>
          </footer>

          {/* Bottom nav — solo móvil */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50">
            <a href="/" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-orange-500 transition px-3 py-1">
              <PawPrint size={22} />
              <span className="text-[10px]">Inicio</span>
            </a>
            <a href="/catalogo" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-orange-500 transition px-3 py-1">
              <Heart size={22} />
              <span className="text-[10px]">Adoptar</span>
            </a>
            <a href="/mapa" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-orange-500 transition px-3 py-1">
              <Map size={22} />
              <span className="text-[10px]">Mapa</span>
            </a>
            <a href="/perdidos" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-orange-500 transition px-3 py-1">
              <Search size={22} />
              <span className="text-[10px]">Perdidos</span>
            </a>
            <a href="/faq" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-orange-500 transition px-3 py-1">
              <BookOpen size={22} />
              <span className="text-[10px]">FAQ</span>
            </a>
          </nav>
        </body>
      </html>
    );
  }
