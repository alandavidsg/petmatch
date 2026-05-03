'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { MapPin, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';

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
  lat: number | null;
  lng: number | null;
  refugio_id: string | null;
};

export default function PetDetail() {
  const router = useRouter();
  const params = useParams();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', motivo: '', vivienda: 'Casa con patio' });

  useEffect(() => {
    async function fetchPet() {
      const { data, error } = await supabase
        .from('mascotas')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!error && data) setPet(data);
      setLoading(false);
    }
    fetchPet();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from('solicitudes').insert({
      mascota_id: pet?.id,
      refugio_id: pet?.refugio_id ?? null,
      nombre_adoptante: form.nombre,
      email_adoptante: form.email,
      telefono_adoptante: form.telefono,
      mensaje: `Vivienda: ${form.vivienda}. ${form.motivo}`,
    });

    if (!error) setSubmitted(true);
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

  return (
    <main className="min-h-screen bg-gray-50 pb-20">

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay fixed inset-0 z-50 bg-black/95 overflow-hidden">
          {/* Track deslizante */}
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

          {/* Cerrar */}
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white text-3xl leading-none z-10 bg-black/40 rounded-full w-10 h-10 flex items-center justify-center">✕</button>

          {/* Flechas */}
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

              {/* Dots */}
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
              {/* Imagen principal — carrusel con slide */}
              <div className="relative rounded-3xl overflow-hidden bg-gray-200 mb-3" style={{ height: '420px' }}>
                {/* Track deslizante */}
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

                {/* Urgente badge */}
                {pet.urgente && (
                  <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 z-10">
                    <AlertTriangle size={12} /> Adopción urgente
                  </span>
                )}

                {/* Flechas */}
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

                    {/* Dots */}
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

              {/* Thumbnails */}
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
              {/* Info de la mascota */}
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

              {/* Formulario o botón */}
              {!showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-5 text-lg font-semibold transition touch-manipulation"
                >
                  Quiero adoptar a {pet.name} 🐾
                </button>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 p-8">
                  <h2 className="text-xl font-semibold text-[#1a1a2e] mb-6">Formulario de adopción</h2>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                      <input type="tel" placeholder="+56 9 xxxx xxxx" required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
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
    </main>
  );
}
