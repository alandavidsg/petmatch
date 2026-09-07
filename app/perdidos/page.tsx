'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PawPrint, Search, Megaphone, Camera, MapPin, Loader2, Lightbulb, Coins, CheckCircle } from 'lucide-react';
import exifr from 'exifr';
import PhotoCropModal from '../components/PhotoCropModal';

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
  const fileSearchCameraRef = useRef<HTMLInputElement>(null);
  const fileSearchGalleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [analysis, setAnalysis] = useState<{ tipo: string; raza: string; color: string; descripcion: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  // Publicaciones nuevas que el buscador aún no alcanzó a analizar, y si el
  // resultado salió de ampliar la búsqueda al mismo tipo por falta de datos de
  // esa raza. Sin esto, ambos casos se veían como un "Sin coincidencias" seco.
  const [calentando, setCalentando] = useState<number>(0);
  const [aproximado, setAproximado] = useState(false);

  // ── Recorte de foto (compartido entre buscar y reportar) ──
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'buscar' | 'reportar' | null>(null);

  // ── REPORTAR ──
  const fileReportCameraRef = useRef<HTMLInputElement>(null);
  const fileReportGalleryRef = useRef<HTMLInputElement>(null);
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

  // Publicación recién creada, para mostrar la confirmación con enlace a la ficha.
  const [publicada, setPublicada] = useState<{ id: number | null; nombre: string } | null>(null);

  // ── LISTADO ──
  const [lostPets, setLostPets] = useState<LostPet[]>([]);

  useEffect(() => {
    supabase.from('mascotas_perdidas')
      .select('id, nombre, tipo, raza, imagen, ultima_ubicacion, recompensa, contacto_nombre, contacto_telefono, encontrada')
      .eq('encontrada', false)
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

  // Extrae coordenadas GPS del EXIF de una foto de galería
  const extractGpsFromFile = async (file: File) => {
    try {
      const gps = await exifr.gps(file);
      if (gps?.latitude && gps?.longitude) {
        setCoords({ lat: gps.latitude, lng: gps.longitude });
        // Geocodificar para obtener nombre legible
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${gps.latitude}&lon=${gps.longitude}&format=json`);
          const data = await res.json();
          const suburb = data.address?.suburb || data.address?.neighbourhood || '';
          const city = data.address?.city || data.address?.town || '';
          setLocation(suburb && city ? `${suburb}, ${city}` : data.display_name?.split(',').slice(0, 2).join(',').trim());
          setLocationReady(true);
        } catch {
          setLocation(`${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`);
          setLocationReady(true);
        }
      }
    } catch { /* sin EXIF, se mantiene la ubicación del navegador */ }
  };

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

  // Lee un archivo como data URI
  const readFile = (f: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(f);
    });

  // ── Recorte (compartido por los dos flujos) ──
  // Ambos abren el mismo editor; `cropTarget` recuerda a cuál devolverle la foto.
  const abrirRecorte = async (file: File, target: 'buscar' | 'reportar') => {
    // El GPS se lee del archivo ORIGINAL: al recortar se pierde el EXIF.
    extractGpsFromFile(file);
    setCropTarget(target);
    setCropSrc(await readFile(file));
  };

  const cancelarRecorte = () => {
    setCropSrc(null);
    setCropTarget(null);
  };

  const confirmarRecorte = async (base64: string) => {
    const target = cropTarget;
    setCropSrc(null);
    setCropTarget(null);
    if (target === 'buscar') await aplicarFotoBusqueda(base64);
    else if (target === 'reportar') await aplicarFotoReporte(base64);
  };

  // ── Handlers buscar ──
  const aplicarFotoBusqueda = async (base64: string) => {
    setPreview(base64);
    const resized = await resizeImage(base64);
    setImageBase64(resized);
    setMatches(null);
    setSearchError(null);
    setAnalysis(null);
  };

  const handleSearch = async () => {
    if (!imageBase64) return;
    setSearching(true);
    setSearchError(null);
    setMatches(null);
    setCalentando(0);
    setAproximado(false);
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
      setCalentando(data.calentando ?? 0);
      setAproximado(!!data.aproximado);
    } catch {
      setSearchError('Error al buscar. Intenta de nuevo.');
    }
    setSearching(false);
  };

  // ── Handlers reportar ──
  const aplicarFotoReporte = async (base64: string) => {
    // El insert sube el File a Storage, así que hay que reconstruirlo desde el
    // recorte; si se subiera el archivo original se publicaría la foto sin recortar.
    const blob = await (await fetch(base64)).blob();
    setReportFile(new File([blob], `perdida-${Date.now()}.jpg`, { type: 'image/jpeg' }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportFile || !reportPreview) return;
    setSubmitting(true);
    try {
      const ext = reportFile.name.split('.').pop() ?? 'jpg';
      const filename = `perdidos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('mascotas-images').upload(filename, reportFile, { contentType: reportFile.type });
      let imageUrl = reportPreview;
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('mascotas-images').getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }
      // Se pide el id de vuelta para poder enlazar la ficha desde la confirmación.
      const { data: nueva, error } = await supabase.from('mascotas_perdidas').insert({
        nombre: form.nombre, tipo: form.tipo, raza: form.raza, color: form.color,
        descripcion: form.descripcion, imagen: imageUrl, ultima_ubicacion: location,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        recompensa: form.recompensa ? parseInt(form.recompensa) : 0,
        contacto_nombre: form.contactoNombre, contacto_telefono: form.telefono, contacto_email: form.email,
      }).select('id').single();
      if (!error) {
        setPublicada({ id: nueva?.id ?? null, nombre: form.nombre || form.tipo || 'Tu mascota' });
        // Limpiar el formulario: si no, al volver a la pestaña de reportar
        // quedaban cargados los datos de la publicación anterior y era fácil
        // publicarla dos veces sin querer.
        setForm({ nombre: '', tipo: '', raza: '', color: '', descripcion: '', recompensa: '', contactoNombre: '', telefono: '', email: '' });
        setReportFile(null);
        setReportPreview(null);
        setSubmitted(true);
        setTab('buscar');
        // El navegador conserva el scroll al cambiar de pestaña: sin esto, quien
        // publicó desde el final del formulario no llegaba a ver la confirmación.
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setSubmitted(false), 100);
      }
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  const getSimilitudColor = (s: number) =>
    s >= 70 ? 'text-green-600 bg-green-50' : s >= 40 ? 'text-orange-500 bg-orange-50' : 'text-gray-500 bg-gray-100';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Editor de recorte: lo comparten la búsqueda y el reporte de pérdida */}
      {cropSrc && (
        <PhotoCropModal src={cropSrc} onCancel={cancelarRecorte} onConfirm={confirmarRecorte} />
      )}

      {/* Hero */}
      <section className="bg-[#1a1a2e] px-8 py-14 text-center">
        <div className="flex justify-center mb-3"><PawPrint size={48} className="text-orange-400" /></div>
        <h1 className="text-white text-4xl font-bold mb-2">Mascotas perdidas</h1>
        <p className="text-white/50 text-base max-w-md mx-auto">
          Busca tu mascota en el catálogo con IA o repórtala como perdida para que la comunidad te ayude.
        </p>
      </section>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-6 mt-8">
        {publicada && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center mb-8">
            <div className="flex justify-center mb-4"><CheckCircle size={56} className="text-green-500" /></div>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2">
              ¡{publicada.nombre} fue publicada!
            </h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Ya aparece en el listado de abajo para que la comunidad pueda reconocerla.
              Comparte el enlace para que llegue a más gente.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-sm mx-auto">
              {publicada.id && (
                <a
                  href={`/perdidos/${publicada.id}`}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center"
                >
                  Ver publicación
                </a>
              )}
              <button
                onClick={() => setPublicada(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-3 rounded-xl transition text-sm"
              >
                Volver
              </button>
            </div>
          </div>
        )}

        <div className={`flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-8 ${publicada ? 'hidden' : ''}`}>
          <button onClick={() => setTab('buscar')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === 'buscar' ? 'bg-[#1a1a2e] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            <Search size={15} /> Buscar en catálogo con IA
          </button>
          <button onClick={() => setTab('reportar')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === 'reportar' ? 'bg-[#1a1a2e] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            <Megaphone size={15} /> Reportar mascota perdida
          </button>
        </div>

        {/* ── TAB BUSCAR ── */}
        {!publicada && tab === 'buscar' && (
          <div>
            {/* Inputs ocultos: cámara y galería separados */}
            <input ref={fileSearchCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) abrirRecorte(f, 'buscar'); e.target.value = ''; }} />
            <input ref={fileSearchGalleryRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) abrirRecorte(f, 'buscar'); e.target.value = ''; }} />

            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-white"
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) abrirRecorte(f, 'buscar'); }}
              onDragOver={(e) => e.preventDefault()}>
              {preview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={preview} alt="preview" className="h-52 w-auto rounded-xl object-cover shadow" />
                  <div className="flex gap-3 mt-1">
                    <button type="button" onClick={() => fileSearchCameraRef.current?.click()}
                      className="flex-1 border border-orange-400 text-orange-500 rounded-xl py-2 text-sm font-medium">
                      Sacar foto
                    </button>
                    <button type="button" onClick={() => fileSearchGalleryRef.current?.click()}
                      className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-2 text-sm font-medium">
                      Cambiar imagen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Camera size={48} className="text-gray-300" />
                  <p className="text-base font-medium text-gray-600">Foto de tu mascota perdida</p>
                  <p className="text-sm text-gray-400">La IA buscará coincidencias en el catálogo</p>
                  <div className="flex gap-3 w-full mt-2">
                    <button type="button" onClick={() => fileSearchCameraRef.current?.click()}
                      className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium">
                      Sacar foto
                    </button>
                    <button type="button" onClick={() => fileSearchGalleryRef.current?.click()}
                      className="flex-1 border border-orange-500 text-orange-500 rounded-xl py-3 text-sm font-medium">
                      Subir imagen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {preview && (
              <button onClick={handleSearch} disabled={searching}
                className="w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2">
                {searching ? <><Loader2 size={18} className="animate-spin" /> Buscando con IA...</> : <><Search size={18} /> Buscar mi mascota</>}
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
                  {matches.length === 0
                    ? (calentando > 0 ? 'Todavía estamos analizando' : 'Sin coincidencias')
                    : (aproximado ? 'Coincidencias aproximadas' : 'Posibles coincidencias')}
                </h2>
                <p className="text-sm text-gray-400 mb-5">
                  {matches.length === 0
                    ? (calentando > 0
                        ? `Hay ${calentando} publicación${calentando === 1 ? '' : 'es'} reciente${calentando === 1 ? '' : 's'} que aún no alcanzamos a analizar. Vuelve a buscar en un momento, o repórtala como perdida.`
                        : 'No encontramos coincidencias. ¿La reportamos como perdida?')
                    : (aproximado
                        ? 'No encontramos publicaciones de esa raza, así que te mostramos otras del mismo tipo. Haz clic en cada una para ver más detalles.'
                        : 'Haz clic en cada mascota para ver más detalles.')}
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
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin size={11} />{m.location}</div>
                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 italic flex items-start gap-1"><Lightbulb size={12} className="mt-0.5 shrink-0" />{m.razon}</div>
                      </div>
                    </a>
                  ))}
                </div>
                {matches.length === 0 && (
                  <button onClick={() => setTab('reportar')}
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2">
                    <Megaphone size={16} /> Reportar como perdida
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB REPORTAR ── */}
        {!publicada && tab === 'reportar' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-10">
            {/* Inputs ocultos: cámara y galería separados */}
            <input ref={fileReportCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) abrirRecorte(f, 'reportar'); e.target.value = ''; }} />
            <input ref={fileReportGalleryRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) abrirRecorte(f, 'reportar'); e.target.value = ''; }} />

            {/* Foto */}
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-white">
              {reportPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={reportPreview} alt="preview" className="h-44 w-auto rounded-xl object-cover shadow" />
                  {analyzing && <p className="text-sm text-orange-500 animate-pulse flex items-center gap-1 justify-center"><Loader2 size={14} className="animate-spin" /> Analizando con IA...</p>}
                  {!analyzing && (
                    <div className="flex gap-3 w-full">
                      <button type="button" onClick={() => fileReportCameraRef.current?.click()}
                        className="flex-1 border border-orange-400 text-orange-500 rounded-xl py-2 text-sm font-medium">
                        Sacar foto
                      </button>
                      <button type="button" onClick={() => fileReportGalleryRef.current?.click()}
                        className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-2 text-sm font-medium">
                        Cambiar imagen
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Camera size={48} className="text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">Foto de tu mascota *</p>
                  <div className="flex gap-3 w-full mt-1">
                    <button type="button" onClick={() => fileReportCameraRef.current?.click()}
                      className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium">
                      Sacar foto
                    </button>
                    <button type="button" onClick={() => fileReportGalleryRef.current?.click()}
                      className="flex-1 border border-orange-500 text-orange-500 rounded-xl py-3 text-sm font-medium">
                      Subir imagen
                    </button>
                  </div>
                </div>
              )}
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
                <MapPin size={16} className="text-orange-400 shrink-0" />
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
              {submitting ? <><Loader2 size={18} className="animate-spin inline mr-1" />Publicando...</> : <><Megaphone size={18} className="inline mr-1" />Publicar mascota perdida</>}
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
              <a key={pet.id} href={`/perdidos/${pet.id}`}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition block">
                <div className="relative">
                  <img src={pet.imagen} alt={pet.nombre} className="h-40 w-full object-cover" />
                  {pet.recompensa > 0 && (
                    <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Coins size={10} />${pet.recompensa.toLocaleString('es-CL')}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-semibold text-[#1a1a2e]">{pet.nombre || 'Sin nombre'}</div>
                  <div className="text-xs text-gray-400 mt-1">{pet.raza} · {pet.tipo}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin size={11} />{pet.ultima_ubicacion}</div>
                  <div className="mt-3 flex items-center justify-center gap-1 w-full text-center bg-orange-50 text-orange-600 text-xs font-semibold py-2 rounded-lg">
                    Ver publicación
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-gray-400">
            <div className="flex justify-center mb-3"><PawPrint size={40} className="text-gray-300" /></div>
            <p>No hay mascotas perdidas reportadas aún</p>
          </div>
        )}
      </div>
    </main>
  );
}
