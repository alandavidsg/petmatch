'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Pet = {
  id: number;
  type: string;
  image: string;
  urgente: boolean;
};

type Article = {
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string };
};

function NewsPreview() {
  const [articles, setArticles] = useState<Article[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const xRef = useRef(0);
  const speedRef = useRef(0.6); // px per frame
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0 });
  const halfWidthRef = useRef(0);

  useEffect(() => {
    fetch('/api/noticias')
      .then((res) => res.json())
      .then((data) => setArticles(data.articles || []))
      .catch(() => {});
  }, []);

  // Auto-scroll loop
  useEffect(() => {
    if (!articles.length) return;

    const track = trackRef.current;
    if (!track) return;

    // Half width = one full set of articles (loopback point)
    halfWidthRef.current = track.scrollWidth / 2;

    const tick = () => {
      if (!dragRef.current.active) {
        xRef.current -= speedRef.current;
        // Loop seamlessly
        if (Math.abs(xRef.current) >= halfWidthRef.current) {
          xRef.current += halfWidthRef.current;
        }
        track.style.transform = `translateX(${xRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [articles]);

  // Drag handlers
  const onDragStart = (clientX: number) => {
    dragRef.current = { active: true, startX: clientX, startOffset: xRef.current };
  };

  const onDragMove = (clientX: number) => {
    if (!dragRef.current.active) return;
    const delta = clientX - dragRef.current.startX;
    let newX = dragRef.current.startOffset + delta;
    // Loop bounds
    const half = halfWidthRef.current;
    if (newX > 0) newX -= half;
    if (Math.abs(newX) >= half) newX += half;
    xRef.current = newX;
    if (trackRef.current) trackRef.current.style.transform = `translateX(${newX}px)`;
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  if (!articles.length) return (
    <div className="text-center py-8 text-gray-300 text-sm">Cargando noticias...</div>
  );

  const doubled = [...articles, ...articles];

  return (
    <div
      className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={(e) => onDragStart(e.clientX)}
      onMouseMove={(e) => onDragMove(e.clientX)}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
      onTouchEnd={onDragEnd}
    >
      <div ref={trackRef} className="flex gap-4" style={{ width: 'max-content', willChange: 'transform' }}>
        {doubled.map((a, i) => (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            draggable={false}
            onClick={(e) => { if (Math.abs(xRef.current - dragRef.current.startOffset) > 5) e.preventDefault(); }}
            className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-300 hover:shadow-md transition flex-shrink-0 w-72"
          >
            {a.image && (
              <img src={a.image} alt={a.title} className="w-full h-36 object-cover" draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div className="p-4">
              <p className="text-xs text-orange-500 mb-1">{a.source.name}</p>
              <p className="text-[#1a1a2e] font-medium text-sm leading-snug line-clamp-2">{a.title}</p>
              <p className="text-xs text-orange-500 mt-2">Leer más →</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function DonationBanner() {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const amounts = [1000, 5000, 10000];

  const handleAmount = (a: number) => {
    setSelected(a);
    setCustom('');
    setShowCustom(false);
  };

  const handleOtro = () => {
    setSelected(null);
    setShowCustom(true);
  };

  const finalAmount = showCustom ? parseInt(custom.replace(/\D/g, '') || '0') : selected;

  return (
    <div className="mt-16 rounded-3xl bg-[#1a1a2e] px-8 py-10 flex flex-col md:flex-row items-center gap-8">
      <div className="flex-1 text-center md:text-left">
        <div className="text-4xl mb-3">🐾</div>
        <h3 className="text-white text-2xl font-semibold mb-2">Ayúdanos a rescatar más mascotas</h3>
        <p className="text-white/50 text-sm leading-relaxed">
          Con tu donación cubrimos veterinario, alimentación y transporte de mascotas rescatadas mientras encuentran un hogar.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 w-full md:w-64">
        <div className="grid grid-cols-2 gap-2 w-full">
          {amounts.map((a) => (
            <button
              key={a}
              onClick={() => handleAmount(a)}
              className={`py-2 rounded-full text-sm font-medium border transition ${
                selected === a && !showCustom
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white/10 text-white border-white/20 hover:bg-orange-500 hover:border-orange-500'
              }`}
            >
              ${a.toLocaleString('es-CL')}
            </button>
          ))}
          <button
            onClick={handleOtro}
            className={`py-2 rounded-full text-sm font-medium border transition col-span-1 ${
              showCustom
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white/10 text-white border-white/20 hover:bg-orange-500 hover:border-orange-500'
            }`}
          >
            Otro
          </button>
        </div>
        {showCustom && (
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
            <input
              type="number"
              placeholder="Ingresa el monto"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-full pl-7 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-orange-400"
              style={{ fontSize: '16px' }}
              autoFocus
            />
          </div>
        )}
        <a
          href={`/donar${finalAmount ? `?monto=${finalAmount}` : ''}`}
          className="w-full text-center bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-medium transition"
        >
          {finalAmount ? `Donar $${finalAmount.toLocaleString('es-CL')}` : 'Donar ahora'}
        </a>
        <p className="text-white/30 text-xs">También puedes donar por transferencia</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPets() {
      const { data, error } = await supabase
        .from('mascotas')
        .select('id, type, image, urgente')
        .eq('available', true);
      if (!error && data) setPets(data);
      setLoading(false);
    }

    fetchPets();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 overflow-x-hidden" suppressHydrationWarning>
      <section className="relative bg-[#1a1a2e] px-8 py-24 text-center overflow-hidden">
        {/* Video de fondo */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          src="/hero.mp4"
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/60 via-[#1a1a2e]/40 to-[#1a1a2e]/80" />

        {/* Contenido */}
        <div className="relative z-10">
          <h1 className="text-white text-5xl font-bold mb-5 max-w-2xl mx-auto leading-tight">
            Encuentra tu compañero ideal
          </h1>
          <p className="text-white/60 text-lg mb-10 max-w-lg mx-auto">
            Mascotas de la calle que necesitan un hogar. Reporta, adopta y cambia vidas.
          </p>
          <a href="/reportar" className="bg-orange-500 hover:bg-orange-600 text-white px-9 py-3.5 rounded-xl text-base font-semibold transition inline-block">
            Reportar mascota
          </a>
          <div className="flex justify-center gap-14 mt-16">
            {[
              { num: '127', label: 'Reportadas' },
              { num: '89', label: 'Adoptadas' },
              { num: '38', label: 'Disponibles' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-orange-500 text-4xl font-bold">{s.num}</div>
                <div className="text-white/50 text-sm mt-1.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de categorías */}
      <section className="max-w-6xl mx-auto px-8 pt-14 pb-4 w-full">
        <h2 className="text-3xl font-semibold text-[#1a1a2e] mb-2">Explorar por categoría</h2>
        <p className="text-gray-400 mb-8">Encuentra exactamente lo que buscas</p>
        {!loading && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Perros en adopción', value: 'Perro', staticImg: '/cat-perros.jpg', video: '/vid-perros.mp4' },
              { label: 'Gatos en adopción', value: 'Gato', staticImg: '/cat-gatos.jpg', video: '/vid-gatos.mp4' },
              { label: 'Animales exóticos', value: 'Animal', staticImg: '/cat-exoticos.jpg', video: '/vid-exoticos.mp4' },
              { label: 'Adopción urgente', value: 'urgente', staticImg: '/cat-urgente.jpg', video: '/vid-urgente.mp4' },
            ].map((cat) => {
              const catPets = cat.value === 'urgente'
                ? pets.filter((p) => p.urgente)
                : pets.filter((p) => p.type === cat.value);
              const count = catPets.length;
              return (
                <a
                  key={cat.value}
                  href={`/catalogo?tipo=${cat.value}`}
                  className="relative rounded-2xl overflow-hidden h-36 md:h-48 text-left group bg-[#1a1a2e]"
                  onMouseEnter={(e) => {
                    const isMob = 'ontouchstart' in window;
                    if (!isMob) {
                      const vid = e.currentTarget.querySelector('video');
                      vid?.play();
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isMob = 'ontouchstart' in window;
                    if (!isMob) {
                      const vid = e.currentTarget.querySelector('video');
                      if (vid) { vid.pause(); vid.currentTime = 0.001; }
                    }
                  }}
                >
                  {/* Video — siempre autoPlay (Safari requiere el atributo desde el inicio) */}
                  {/* En desktop: se pausa tras cargar y se reproduce al hover */}
                  <video
                    src={cat.video}
                    poster={cat.staticImg}
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="auto"
                    className="absolute inset-0 w-full h-full object-cover object-center cat-video"
                    onLoadedData={(e) => {
                      const v = e.target as HTMLVideoElement;
                      const isMob = 'ontouchstart' in window || window.innerWidth < 768;
                      if (!isMob) {
                        v.pause();
                        v.currentTime = 0.001;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/30 group-hover:via-black/10 group-hover:to-transparent transition duration-500" />
                  <div className="absolute bottom-0 left-0 p-5">
                    <p className="text-white font-semibold text-base md:text-lg leading-tight">{cat.label}</p>
                    <p className="text-white/60 text-sm mt-1">
                      {count > 0 ? `${count} mascota${count !== 1 ? 's' : ''}` : 'Sin mascotas aún'}
                    </p>
                  </div>
                </a>
              );
            })}

          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-8 py-12 w-full">
        {/* Noticias */}
        <div className="mt-16 flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-semibold text-[#1a1a2e]">Noticias</h2>
            <p className="text-gray-400 text-sm mt-1">Lo último sobre mascotas y adopción</p>
          </div>
          <a href="/noticias" className="text-orange-500 text-sm font-medium hover:underline">Ver todas →</a>
        </div>
        <NewsPreview />

        {/* Banner de donaciones */}
        <DonationBanner />
      </section>
    </main>
  );
}
