'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Match = {
  id: number;
  name: string;
  type: string;
  breed: string;
  image: string;
  location: string;
  similitud: number;
  razon: string;
};

type LostPet = {
  id: number;
  nombre: string;
  tipo: string;
  raza: string;
  imagen: string;
  ultima_ubicacion: string;
  recompensa: number;
  contacto_nombre: string;
  contacto_telefono: string;
  encontrada: boolean;
};

export default function PerdidosPage() {
  const [tab, setTab] = useState<'buscar' | 'reportar'>('buscar');

  // ── BUSCAR ──
  const fileSearchRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [analysis, setAnalysis] = useState<{ tipo: string; raza: string; color: string; descripcion: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── REPORTAR ──
  const fileReportRef = useRef<HTMLInputElement>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [location, setLocation] = useState('Obteniendo ubicación...');
  const [locationReady, setLocationReady] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({
    nombre: '', tipo: '', raza: '', color: '', descripcion: '',
    recompensa: '', contactoNombre: '', telefono: '', email: '',
  });

  // ── LISTADO ──
  const [lostPets, setLostPets] = useState<LostPet[]>([]);

  useEffect(() => {
    supabase.from('mascotas_perdidas').select('*').eq('encontrada', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLostPets(data); });
  }, [submitted]);

  // Geolocalización
  const getLocation = () => {
    if (!navigator.geolocation) { setLocation('No disponible'); setLocationReady(true); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const suburb = data.address?.suburb || data.address?.neighbourhood || '';
          const city = data.address?.city || data.address?.town || '';
          setLocation(suburb && city ? `${suburb}, ${city}` : data.display_name?.split(',').slice(0, 2).join(',').trim());
        } catch { setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`); }
        setLocationReady(true);
      },
      () => { setLocation('No se pudo obtener ubicación'); setLocationReady(true); },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    getLocation();
    const t = setTimeout(() => setLocationReady((r) => { if (!r) setLocation('Ingresa la ubicación manualmente'); return true; }), 6000);
    return () => clearTimeout(t);
  }, []);

  // Resize imagen
  const resizeImage = (base64: string, maxSize = 800): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = base64;
    });

  // ── Handlers buscar ──
  const handleSearchFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const original = e.target?.result as string;
      setPreview(original);
      const resized = await resizeImage(original);
      setImageBase64(resized);
      setMatches(null);
      setSearchError(null);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async () => {
    if (!imageBase64) return;
    setSearching(true);
    setSearchError(null);
    setMatches(null);
    try {
      const res = await fetch('/api/buscar-mascota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMatches(data.matches);
      setAnalysis(data.analysis ?? null);
    } catch {
      setSearchError('Error al buscar. Intenta de nuevo.');
    }
    setSearching(false);
  };

  // ── Handlers reportar ──
  const handleReportFile = async (f: File) => {
    setReportFile(f);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setReportPreview(base64);
      setAnalyzing(true);
      try {
        const resized = await resizeImage(base64, 512);
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: resized }),
        });
        const data = await res.json();
        if (data.tipo || data.raza) {
          setForm((prev) => ({ ...prev, tipo: data.tipo || prev.tipo, raza: data.raza || prev.raza, color: data.color || prev.color, descripcion: data.descripcion || prev.descripcion }));
        }
      } catch { /* silent */ }
      setAnalyzing(false);
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportFile || !reportPreview) return;
    setSubmitting(true);
    try {
      const ext = reportFile.name.split('.').pop() ?? 'jpg';
      const filename = `perdidos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('mascotas').upload(filename, reportFile, { contentType: reportFile.type });
      let imageUrl = reportPreview;
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('mascotas').getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from('mascotas_perdidas').insert({
        nombre: form.nombre, tipo: form.tipo, raza: form.raza, color: form.color,
        descripcion: form.descripcion, imagen: imageUrl, ultima_ubicacion: location,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        recompensa: form.recompensa ? parseInt(form.recompensa) : 0,
        contacto_nombre: form.contactoNombre, contacto_telefono: form.telefono, contacto_email: form.email,
      });
      if (!error) {
        setSubmitted(true);
        setTab('buscar');
        setTimeout(() => setSubmitted(false), 100);
      }
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  const getSimilitudColor = (s: number) =>
    s >= 70 ? 'text-green-600 bg-green-50' : s >= 40 ? 'text-orange-500 bg-orange-50' : 'text-gray-500 bg-gray-100';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-[#1a1a2e] px-8 py-14 text-center">
        <div className="text-5xl mb-3">🐾</div>
        <h1 className="text-white text-4xl font-bold mb-2">Mascotas perdidas</h1>
        <p className="text-white/50 text-base max-w-md mx-auto">
          Busca tu mascota en el catálogo con IA o repórtala como perdida para que la comunidad te ayude.
        </p>
      </section>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-6 mt-8">
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-8">
          <button onClick={() => setTab('buscar')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition ${tab === 'buscar' ? 'bg-[#1a1a2e] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            🔍 Buscar en catálogo con IA
          </button>
          <button onClick={() => setTab('reportar')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition ${tab === 'reportar' ? 'bg-[#1a1a2e] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            📢 Reportar mascota perdida
          </button>
        </div>

        {/* ── TAB BUSCAR ── */}
        {tab === 'buscar' && (
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-orange-400 transition bg-white"
              onClick={() => fileSearchRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleSearchFile(f); }}
              onDragOver={(e) => e.preventDefault()}>
              {preview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={preview} alt="preview" className="h-52 w-auto rounded-xl object-cover shadow" />
                  <p className="text-xs text-gray-400">Haz clic para cambiar la foto</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="text-6xl">📷</div>
                  <p className="text-base font-medium text-gray-600">Sube una foto de tu mascota perdida</p>
                  <p className="text-sm">La IA buscará coincidencias en el catálogo</p>
                </div>
              )}
              <input ref={fileSearchRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSearchFile(f); }} />
            </div>

            {preview && (
              <button onClick={handleSearch} disabled={searching}
                className="w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2">
                {searching ? <><span className="animate-spin">⏳</span> Buscando con IA...</> : <>🔍 Buscar mi mascota</>}
              </button>
            )}

            {searchError && <div className="mt-4 bg-red-50 text-red-600 rounded-xl p-4 text-sm text-center">{searchError}</div>}

            {analysis && (
              <div className="mt-5 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">Detectado por la IA</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {analysis.tipo && <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">{analysis.tipo}</span>}
                  {analysis.raza && <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">{analysis.raza}</span>}
                  {analysis.color && <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{analysis.color}</span>}
                </div>
                <p className="text-sm text-blue-800">{analysis.descripcion}</p>
              </div>
            )}

            {matches !== null && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-[#1a1a2e] mb-1">
                  {matches.length > 0 ? 'Posibles coincidencias' : 'Sin coincidencias'}
                </h2>
                <p className="text-sm text-gray-400 mb-5">
                  {matches.length > 0 ? 'Haz clic en cada mascota para ver más detalles.' : 'No encontramos coincidencias. ¿La reportamos como perdida?'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {matches.map((m) => (
                    <a key={m.id} href={`/mascota/${m.id}`}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-300 hover:shadow-lg transition flex flex-col">
                      <div className="relative">
                        <img src={m.image} alt={m.name} className="h-40 w-full object-cover" />
                        <span className={`absolute top-2 right-2 text-xs font-bold px-3 py-1 rounded-full ${getSimilitudColor(m.similitud)}`}>
                          {m.similitud}%
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="font-semibold text-[#1a1a2e]">{m.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{m.breed} · {m.type}</div>
                        <div className="text-xs text-gray-400 mt-1">📍 {m.location}</div>
                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 italic">💡 {m.razon}</div>
                      </div>
                    </a>
                  ))}
                </div>
                {matches.length === 0 && (
                  <button onClick={() => setTab('reportar')}
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition text-sm">
                    📢 Reportar como perdida
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB REPORTAR ── */}
        {tab === 'reportar' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-10">
            {/* Foto */}
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 transition bg-white"
              onClick={() => fileReportRef.current?.click()}>
              {reportPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={reportPreview} alt="preview" className="h-44 w-auto rounded-xl object-cover shadow" />
                  {analyzing && <p className="text-sm text-orange-500 animate-pulse">🤖 Analizando con IA...</p>}
                  {!analyzing && <p className="text-xs text-gray-400">Haz clic para cambiar la foto</p>}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="text-5xl">📷</div>
                  <p className="text-sm font-medium text-gray-600">Sube una foto de tu mascota *</p>
                </div>
              )}
              <input ref={fileReportRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReportFile(f); }} />
            </div>

            {/* Datos mascota */}
            <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="font-semibold text-[#1a1a2e]">Datos de la mascota</h3>
              <input type="text" placeholder="Nombre de tu mascota" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 bg-white">
                  <option value="">Tipo de animal</option>
                  <option>Perro</option><option>Gato</option><option>Otro</option>
                </select>
                <input type="text" placeholder="Raza" value={form.raza}
                  onChange={(e) => setForm({ ...form, raza: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <input type="text" placeholder="Color del pelaje" value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
              <textarea rows={3} placeholder="Descripción: marcas, collar, comportamiento..." value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 resize-none" />
            </div>

            {/* Ubicación */}
            <div className="bg-white rounded-2xl p-6 flex flex-col gap-3 shadow-sm">
              <h3 className="font-semibold text-[#1a1a2e]">Última ubicación vista</h3>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span>📍</span>
                <span className="text-sm text-gray-600 flex-1">{location}</span>
                <button type="button" onClick={getLocation} className="text-xs text-orange-500 font-medium">Actualizar</button>
              </div>
              <input type="text" placeholder="O escribe la dirección manualmente" value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            </div>

            {/* Recompensa */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-[#1a1a2e] mb-3">Recompensa (opcional)</h3>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" placeholder="0" min="0" value={form.recompensa}
                  onChange={(e) => setForm({ ...form, recompensa: e.target.value })}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <p className="text-xs text-gray-400 mt-2">Monto en pesos chilenos (CLP)</p>
            </div>

            {/* Contacto */}
            <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="font-semibold text-[#1a1a2e]">Tu contacto</h3>
              <input type="text" placeholder="Tu nombre *" required value={form.contactoNombre}
                onChange={(e) => setForm({ ...form, contactoNombre: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="+56 9 1234 5678 *" required value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
                <input type="email" placeholder="Email (opcional)" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
              </div>
            </div>

            <button type="submit" disabled={!reportFile || submitting || !locationReady}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition">
              {submitting ? '⏳ Publicando...' : '📢 Publicar mascota perdida'}
            </button>
          </form>
        )}
      </div>

      {/* Listado de mascotas perdidas */}
      <div className="max-w-5xl mx-auto px-6 pb-16 mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a2e]">Reportadas como perdidas</h2>
            <p className="text-sm text-gray-400 mt-1">
              {lostPets.length > 0 ? `${lostPets.length} mascota${lostPets.length !== 1 ? 's' : ''} buscando a su dueño` : 'Sin reportes aún'}
            </p>
          </div>
        </div>

        {lostPets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lostPets.map((pet) => (
              <div key={pet.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="relative">
                  <img src={pet.imagen} alt={pet.nombre} className="h-40 w-full object-cover" />
                  {pet.recompensa > 0 && (
                    <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full">
                      💰 ${pet.recompensa.toLocaleString('es-CL')}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-semibold text-[#1a1a2e]">{pet.nombre || 'Sin nombre'}</div>
                  <div className="text-xs text-gray-400 mt-1">{pet.raza} · {pet.tipo}</div>
                  <div className="text-xs text-gray-400 mt-1">📍 {pet.ultima_ubicacion}</div>
                  <a href={`tel:${pet.contacto_telefono}`}
                    className="mt-3 block w-full text-center bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold py-2 rounded-lg transition">
                    📞 Llamar a {pet.contacto_nombre}
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-gray-400">
            <div className="text-4xl mb-3">🐾</div>
            <p>No hay mascotas perdidas reportadas aún</p>
          </div>
        )}
      </div>
    </main>
  );
}
