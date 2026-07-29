'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '../../../lib/supabase';
import { MapPin, ArrowLeft, AlertTriangle, CheckCircle, Eye, PawPrint, HouseHeart, HeartPulse, Link2, Check, Home } from 'lucide-react';

// Leaflet no soporta SSR — cargar el modal del mapa solo en el cliente
const RefugioMapModal = dynamic(() => import('./RefugioMapModal'), { ssr: false });

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.124 1.532 5.856L.057 23.571a.75.75 0 00.92.92l5.715-1.474A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.502-5.2-1.382l-.373-.215-3.865.997.997-3.865-.215-.373A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );
}

type Pet = {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: string;
  location: string;
  image: string;
  images: string[];
  description: string;
  urgente: boolean;
  hogar_temporal: boolean;
  necesita_operacion: boolean;
  lat: number | null;
  lng: number | null;
  avistamientos_count: number | null;
};

type Avistamiento = {
  id: string;
  lat: number | null;
  lng: number | null;
  location: string | null;
  imagen: string | null;
  created_at: string;
};

export default function PetDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mapModal, setMapModal] = useState<'refugio' | 'veterinaria' | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [tipoSolicitud, setTipoSolicitud] = useState<'adopcion' | 'hogar_temporal'>('adopcion');
  const [avistamientos, setAvistamientos] = useState<Avistamiento[]>([]);
  const [currentImg, setCurrentImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', motivo: '', vivienda: 'Casa con patio' });

  useEffect(() => {
    async function fetchPet() {
      const { data, error } = await supabase
        .from('mascotas')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setPet(data);
        const avRes = await fetch(`/api/avistamientos?mascota_id=${id}`);
        if (avRes.ok) setAvistamientos(await avRes.json());
      }
      setLoading(false);
    }
    fetchPet();
  }, [id]);

  // Compartir enlace: menú nativo en móvil, copiar al portapapeles en desktop
  const shareLink = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: pet?.name ?? 'Matchcota', url }); } catch { /* usuario canceló */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* portapapeles no disponible */ }
  };

  const shareOnWhatsApp = () => {
    const url = window.location.href;
    const text = `¡Mira a ${pet?.name}! 🐾 ${pet?.breed ? `${pet.type} · ${pet.breed}` : pet?.type} en adopción en ${pet?.location}.\n\nVélo acá: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mascota_id: pet?.id,
        nombre_adoptante: form.nombre,
        email_adoptante: form.email,
        telefono_adoptante: form.telefono ? `+56 ${form.telefono}` : '',
        mensaje: `Vivienda: ${form.vivienda}. ${form.motivo}`,
        tipo: tipoSolicitud,
      }),
    });

    if (res.ok) {
      setSubmitted(true);
      setSubmitError(false);
    } else {
      setSubmitError(true);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="text-center py-20 text-gray-400">
      <div className="flex justify-center mb-4"><MapPin size={40} className="text-orange-300 animate-bounce" /></div>
      <p>Cargando...</p>
    </div>
  );

  if (!pet) return (
    <div className="text-center py-20 text-gray-400">Mascota no encontrada</div>
  );

  const allImages = (pet.images && pet.images.length > 0) ? pet.images : [pet.image];

  // Última ubicación conocida: el avistamiento más reciente con coordenadas, o donde se publicó
  const lastSighting = avistamientos.find((a) => a.lat != null && a.lng != null);
  const lastSeen =
    lastSighting ? { lat: lastSighting.lat as number, lng: lastSighting.lng as number }
    : pet.lat != null && pet.lng != null ? { lat: pet.lat, lng: pet.lng }
    : null;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay fixed inset-0 z-50 bg-black/95 overflow-hidden">
          <div
            className="flex h-full"
            style={{
              width: `${allImages.length * 100}%`,
              transform: `translateX(-${(currentImg * 100) / allImages.length}%)`,
              transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) {
                setCurrentImg((i) => diff > 0
                  ? (i + 1) % allImages.length
                  : (i - 1 + allImages.length) % allImages.length
                );
              }
            }}
          >
            {allImages.map((img, i) => (
              <div
                key={i}
                className="h-full flex items-center justify-center flex-shrink-0 cursor-zoom-out"
                style={{ width: `${100 / allImages.length}%` }}
                onClick={() => setLightbox(false)}
              >
                <img
                  src={img}
                  alt={`${pet.name} ${i + 1}`}
                  className="max-h-screen object-contain px-8"
                  style={{ maxWidth: '100%' }}
                  draggable={false}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ))}
          </div>

          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white text-3xl leading-none z-10 bg-black/40 rounded-full w-10 h-10 flex items-center justify-center">✕</button>

          {allImages.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImg((i) => (i - 1 + allImages.length) % allImages.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-11 h-11 flex items-center justify-center text-2xl transition z-10 disabled:opacity-20"
              >‹</button>
              <button
                onClick={() => setCurrentImg((i) => (i + 1) % allImages.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-11 h-11 flex items-center justify-center text-2xl transition z-10 disabled:opacity-20"
              >›</button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    className={`rounded-full transition-all ${i === currentImg ? 'bg-white w-5 h-2' : 'bg-white/40 w-2 h-2'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1a2e] px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-white/50 hover:text-white text-sm flex items-center gap-1 transition"
          >
            <ArrowLeft size={16} /> Volver al catálogo
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {submitted ? (
          <div className="text-center py-20">
            <div className="flex justify-center mb-4"><CheckCircle size={64} className="text-green-500" /></div>
            <h2 className="text-2xl font-semibold text-[#1a1a2e] mb-3">¡Solicitud enviada!</h2>
            <p className="text-gray-400 mb-8">Te contactaremos pronto para coordinar la adopción de {pet.name}.</p>
            <button onClick={() => router.push('/')} className="bg-orange-500 text-white px-8 py-3 rounded-xl hover:bg-orange-600 transition">
              Volver al catálogo
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-start">

            {/* Columna izquierda — fotos */}
            <div>
              <div className="relative rounded-3xl overflow-hidden bg-gray-200 mb-3" style={{ height: '420px' }}>
                <div
                  className="flex h-full"
                  style={{
                    width: `${allImages.length * 100}%`,
                    transform: `translateX(-${(currentImg * 100) / allImages.length}%)`,
                    transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    const diff = touchStartX.current - e.changedTouches[0].clientX;
                    if (Math.abs(diff) > 40) {
                      setCurrentImg((i) => diff > 0
                        ? (i + 1) % allImages.length
                        : (i - 1 + allImages.length) % allImages.length
                      );
                    }
                  }}
                >
                  {allImages.map((img, i) => (
                    <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / allImages.length}%` }}>
                      <img
                        src={img}
                        alt={`${pet.name} ${i + 1}`}
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => { setCurrentImg(i); setLightbox(true); }}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>

                {pet.urgente && (
                  <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 z-10">
                    <AlertTriangle size={12} /> Adopción urgente
                  </span>
                )}
                {pet.hogar_temporal && (
                  <span className={`absolute ${pet.urgente ? 'top-14' : 'top-4'} left-4 bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 z-10`}>
                    <Home size={12} /> Busca hogar temporal
                  </span>
                )}
                {pet.necesita_operacion && (
                  <span className={`absolute ${[pet.urgente, pet.hogar_temporal].filter(Boolean).length === 2 ? 'top-24' : [pet.urgente, pet.hogar_temporal].some(Boolean) ? 'top-14' : 'top-4'} left-4 bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 z-10`}>
                    <HeartPulse size={12} /> Necesita operación
                  </span>
                )}

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImg((i) => (i - 1 + allImages.length) % allImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition z-10 disabled:opacity-20"
                    >‹</button>
                    <button
                      onClick={() => setCurrentImg((i) => (i + 1) % allImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition z-10 disabled:opacity-20"
                    >›</button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImg(i)}
                          className={`rounded-full transition-all ${i === currentImg ? 'bg-white w-5 h-2' : 'bg-white/50 w-2 h-2'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImg(i)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${i === currentImg ? 'border-orange-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Columna derecha — info + formulario */}
            <div>
              <div className="bg-white rounded-3xl border border-gray-100 p-8 mb-6">
                <div className="flex items-start justify-between mb-3">
                  <h1 className="text-4xl font-bold text-[#1a1a2e]">{pet.name}</h1>
                  <span className="text-sm px-4 py-1.5 rounded-full bg-orange-50 text-orange-500 font-medium mt-1">{pet.type}</span>
                </div>

                <div className="flex flex-col gap-1 mb-5">
                  <p className="text-gray-400">{pet.breed} · {pet.age}</p>
                  <a
                    href={pet.lat && pet.lng ? `https://www.google.com/maps?q=${pet.lat},${pet.lng}` : `https://www.google.com/maps/search/${encodeURIComponent(pet.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 text-sm flex items-center gap-1 hover:text-orange-500 transition w-fit"
                  >
                    <MapPin size={14} />{pet.location}
                  </a>
                </div>

                <div className="h-px bg-gray-100 mb-5" />

                <p className="text-gray-600 leading-relaxed">{pet.description}</p>
              </div>

              {avistamientos.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye size={16} className="text-orange-500" />
                    <h3 className="font-semibold text-[#1a1a2e] text-sm">
                      Historial de avistamientos · {(pet.avistamientos_count ?? 1)} {(pet.avistamientos_count ?? 1) === 1 ? 'vez visto' : 'veces visto'}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {avistamientos.map((av, i) => (
                      <div key={av.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${i === 0 ? 'bg-orange-500' : 'bg-gray-300'}`} />
                          {i < avistamientos.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1 mb-0" style={{ minHeight: '24px' }} />}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-[#1a1a2e]">
                              {new Date(av.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {i === 0 && <span className="text-[10px] bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full font-medium">Último avistamiento</span>}
                          </div>
                          {av.location && (
                            <button
                              onClick={() => {
                                const url = av.lat && av.lng
                                  ? `https://www.google.com/maps?q=${av.lat},${av.lng}`
                                  : `https://www.google.com/maps/search/${encodeURIComponent(av.location!)}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 hover:text-orange-500 transition"
                            >
                              <MapPin size={10} /> {av.location}
                            </button>
                          )}
                          {av.imagen && (
                            <img src={av.imagen} alt="avistamiento" className="w-16 h-16 object-cover rounded-lg mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showForm ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => { setTipoSolicitud('adopcion'); setShowForm(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-4 md:py-5 px-4 text-base md:text-lg font-semibold transition touch-manipulation"
                  >
                    <span className="text-center leading-snug">Quiero adoptar a {pet.name.replace(/\s+reportado$/i, '')}</span>
                    <PawPrint size={18} className="shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={shareOnWhatsApp}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-2xl py-4 text-base font-semibold transition touch-manipulation"
                  >
                    <WhatsAppIcon />
                    Compartir por WhatsApp
                  </button>
                  {lastSeen && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setMapModal('refugio')}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white rounded-2xl py-4 text-sm font-semibold transition touch-manipulation"
                      >
                        <HouseHeart size={18} className="text-orange-400 shrink-0" />
                        Refugio más cercano
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapModal('veterinaria')}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white rounded-2xl py-4 text-sm font-semibold transition touch-manipulation"
                      >
                        <HeartPulse size={18} className="text-sky-400 shrink-0" />
                        Veterinaria más cercana
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={shareLink}
                    className="self-center flex items-center gap-1.5 text-gray-400 hover:text-orange-500 text-xs font-medium transition py-1 touch-manipulation"
                  >
                    {linkCopied ? <><Check size={13} className="text-green-500" /> Enlace copiado</> : <><Link2 size={13} /> Compartir enlace</>}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 p-8">
                  <h2 className="text-xl font-semibold text-[#1a1a2e] mb-6">
                    {tipoSolicitud === 'hogar_temporal' ? 'Formulario de hogar temporal' : 'Formulario de adopción'}
                  </h2>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {pet.hogar_temporal && (
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Tipo de solicitud</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setTipoSolicitud('adopcion')}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition touch-manipulation ${tipoSolicitud === 'adopcion' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                          >
                            <PawPrint size={16} className="shrink-0" /> Adopción
                          </button>
                          <button
                            type="button"
                            onClick={() => setTipoSolicitud('hogar_temporal')}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition touch-manipulation ${tipoSolicitud === 'hogar_temporal' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                          >
                            <Home size={16} className="shrink-0" /> Hogar temporal
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Nombre completo</label>
                      <input type="text" placeholder="Tu nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Email</label>
                      <input type="email" placeholder="tu@email.com" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Teléfono</label>
                      <div className="flex rounded-xl border border-gray-200 focus-within:border-orange-400 overflow-hidden">
                        <span className="bg-gray-50 text-gray-500 text-sm px-3 flex items-center border-r border-gray-200 shrink-0">+56</span>
                        <input type="tel" placeholder="9 xxxx xxxx" required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="flex-1 text-sm px-3 py-3 focus:outline-none bg-white" style={{ fontSize: '16px' }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Tipo de vivienda</label>
                      <select value={form.vivienda} onChange={(e) => setForm({ ...form, vivienda: e.target.value })} className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }}>
                        <option>Casa con patio</option>
                        <option>Departamento</option>
                        <option>Casa sin patio</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">¿Por qué quieres adoptar?</label>
                      <textarea rows={4} placeholder="Cuéntanos un poco..." required value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400 resize-none" style={{ fontSize: '16px' }} />
                    </div>
                    {submitError && (
                      <p className="text-sm text-red-500 text-center">Hubo un error al enviar. Intenta de nuevo.</p>
                    )}
                    <button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-semibold transition disabled:opacity-60 touch-manipulation" style={{ minHeight: '56px', fontSize: '16px' }}>
                      {submitting ? 'Enviando...' : 'Enviar solicitud'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="w-full text-gray-400 py-2 touch-manipulation text-sm">
                      Cancelar
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {mapModal && lastSeen && (
        <RefugioMapModal
          petName={pet.name}
          petLocation={lastSighting?.location ?? pet.location}
          lat={lastSeen.lat}
          lng={lastSeen.lng}
          tipo={mapModal}
          onClose={() => setMapModal(null)}
        />
      )}
    </main>
  );
}
