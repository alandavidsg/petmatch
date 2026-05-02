  import type { Metadata } from 'next';
  import './globals.css';

  export const metadata: Metadata = {
    title: 'PetMatch - Adopta una mascota',
    description: 'Conectando mascotas de la calle con hogares llenos de amor en Chile',
  };

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="es">
        <body>
          <div className="bg-[#12122a] px-8 py-2 flex items-center justify-between text-xs text-white/40">
            <span>Ayudando a mascotas desde 2026</span>
            <div className="flex gap-4">
              <a href="/quienes-somos" className="hover:text-white transition">Quienes somos</a>
              <a href="/contacto" className="hover:text-white transition">Contacto</a>
            </div>
          </div>

          <nav className="bg-[#1a1a2e] px-8 py-4 flex items-center justify-between">
            <a href="/" className="text-white text-xl font-semibold tracking-tight">
              Pet<span className="text-orange-500">Match</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="/catalogo" className="text-white/60 hover:text-white text-sm transition">Catalogo</a>
              <a href="/mapa" className="text-white/60 hover:text-white text-sm transition">Mapa</a>
              <a href="/perdidos" className="text-white/60 hover:text-white text-sm transition">Perdidos</a>
              <a href="/reportar" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Reportar</a>
            </div>
          </nav>

          {children}

          <footer className="bg-[#1a1a2e] mt-8">
            <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-white text-lg font-semibold mb-3">Pet<span className="text-orange-500">Match</span></div>
                <p className="text-white/40 text-sm leading-relaxed">Conectando mascotas de la calle con hogares llenos de amor en Chile.</p>
              </div>
              <div>
                <div className="text-white text-sm font-medium mb-3">Enlaces</div>
                <div className="flex flex-col gap-2">
                  <a href="/catalogo" className="text-white/40 hover:text-white text-sm transition">Catalogo</a>
                  <a href="/mapa" className="text-white/40 hover:text-white text-sm transition">Mapa</a>
                  <a href="/perdidos" className="text-white/40 hover:text-white text-sm transition">Mascotas perdidas</a>
                  <a href="/reportar" className="text-white/40 hover:text-white text-sm transition">Reportar mascota</a>
                  <a href="/quienes-somos" className="text-white/40 hover:text-white text-sm transition">Quienes somos</a>
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
        </body>
      </html>
    );
  } 