'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Camera, Home, MapPin, Phone, CheckCircle, Sparkles, PenLine, AlertTriangle, Eye } from 'lucide-react';
import exifr from 'exifr';

export default function ReportarPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'elegir' | 'calle' | 'adopcion'>('elegir');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detección de duplicados
  type DupMatch = { id: number; name: string; image: string; location: string; similitud: number; razon: string };
  const [dupMatches, setDupMatches] = useState<DupMatch[]>([]);
  const [showDupModal, setShowDupModal] = useState(false);
  const [checkingDups, setCheckingDups] = useState(false);
  const [location, setLocation] = useState('Obteniendo ubicación...');
  const [locationReady, setLocationReady] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ tipo: '', raza: '', edad: '', color: '', descripcion: '' });
  const [adoptForm, setAdoptForm] = useState({ nombre: '', tipo: '', raza: '', sexo: '', edad: '', color: '', descripcion: '', contactoNombre: '', telefono: '', email: '' });

  const getLocation = () => {
    if (!navigator.geolocation) { setLocation('Geolocalización no disponible'); setLocationReady(true); return; }
    setLocation('Obteniendo ubicación...');
    setLocationReady(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || '';
          const city = data.address?.city || data.address?.town || data.address?.municipality || '';
          setLocation(suburb && city ? `${suburb}, ${city}` : data.display_name?.split(',').slice(0, 2).join(',').trim());
        } catch { setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`); }
        setLocationReady(true);
      },
      (err) => { setLocation(err.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener ubicación'); setLocationReady(true); },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    getLocation();
    const fallback = setTimeout(() => {
      setLocationReady((ready) => { if (!ready) setLocation('Ingresa la ubicación manualmente'); return true; });
    }, 6000);
    return () => clearTimeout(fallback);
  }, []);

  const resizeImage = (base64: string, maxSize = 512): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = base64;
    });

  const readFile = (f: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.readAsDataURL(f);
    });

  // Busca duplicados por similitud visual antes de publicar
  const checkDuplicates = async (imageBase64: string): Promise<DupMatch[]> => {
    try {
      const res = await fetch('/api/buscar-mascota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      return (data.matches ?? []).filter((m: DupMatch) => m.similitud >= 70);
    } catch { return []; }
  };

  const extractGpsFromFile = async (file: File) => {
    try {
      const gps = await exifr.gps(file);
      if (gps?.latitude && gps?.longitude) {
        setCoords({ lat: gps.latitude, lng: gps.longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${gps.latitude}&lon=${gps.longitude}&format=json`);
          const data = await res.json();
          const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || '';
          const city = data.address?.city || data.address?.town || data.address?.municipality || '';
          setLocation(suburb && city ? `${suburb}, ${city}` : data.display_name?.split(',').slice(0, 2).join(',').trim());
          setLocationReady(true);
        } catch {
          setLocation(`${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`);
          setLocationReady(true);
        }
      }
    } catch { /* sin EXIF, se mantiene la ubicación del navegador */ }
  };

  const handleFirstPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Intentar leer GPS del EXIF (fotos de galería)
    extractGpsFromFile(f);
    const base64 = await readFile(f);
    setFiles([f]);
    setPreviews([base64]);
    const resized = await resizeImage(base64);
    analyzePhoto(resized);
  };

  const handleExtraPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const newPreviews = await Promise.all(selected.map(readFile));
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const makeMain = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(index, 1);
      arr.unshift(item);
      return arr;
    });
    setPreviews((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(index, 1);
      arr.unshift(item);
      return arr;
    });
  };

  const analyzePhoto = (imageBase64: string) => {
    setAnalyzing(true);
    fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64 }) })
      .then((res) => res.json())
      .then((result) => { setForm({ tipo: result.tipo || '', raza: result.raza || '', edad: result.edad || '', color: result.color || '', descripcion: result.descripcion || '' }); setAnalyzing(false); })
      .catch(() => { setForm({ tipo: '', raza: '', edad: '', color: '', descripcion: '' }); setAnalyzing(false); });
  };

  const handleAdoptSubmit = async () => {
    if (!files.length) return;
    setSubmitting(true);

    const imageUrls: string[] = [];
    for (const f of files) {
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name}`;
      const { error } = await supabase.storage.from('mascotas-images').upload(filename, f);
      if (!error) {
        const { data } = supabase.storage.from('mascotas-images').getPublicUrl(filename);
        imageUrls.push(data.publicUrl);
      }
    }

    if (!imageUrls.length) { alert('Error subiendo imágenes. Intenta de nuevo.'); setSubmitting(false); return; }

    const { error } = await supabase.from('mascotas').insert({
      name: adoptForm.nombre || `${adoptForm.tipo} en adopción`,
      type: adoptForm.tipo,
      breed: adoptForm.raza,
      age: adoptForm.edad,
      location: location || 'Consultar con dueño',
      image: imageUrls[0],
      images: imageUrls,
      description: `${adoptForm.descripcion}. Color: ${adoptForm.color}${adoptForm.sexo ? `. Sexo: ${adoptForm.sexo}` : ''}. Contacto: ${adoptForm.contactoNombre}, ${adoptForm.telefono}, ${adoptForm.email}`,
      available: true,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });

    if (error) { alert('Error guardando mascota. Intenta de nuevo.'); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(() => router.push('/'), 2500);
  };

  // Publica la mascota como nueva (sin duplicado)
  const publishNew = async () => {
    setSubmitting(true);
    const imageUrls: string[] = [];
    for (const f of files) {
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name}`;
      const { error } = await supabase.storage.from('mascotas-images').upload(filename, f);
      if (!error) {
        const { data } = supabase.storage.from('mascotas-images').getPublicUrl(filename);
        imageUrls.push(data.publicUrl);
      }
    }
    if (!imageUrls.length) { alert('Error subiendo imágenes. Intenta de nuevo.'); setSubmitting(false); return; }

    const { error: insertError } = await supabase.from('mascotas').insert({
      name: `${form.tipo}${form.raza ? ` ${form.raza}` : ''} reportado`,
      type: form.tipo,
      breed: form.raza,
      age: form.edad,
      location: location || 'Ubicación no especificada',
      image: imageUrls[0],
      images: imageUrls,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      description: `${form.descripcion}. Color: ${form.color}`,
      available: true,
      avistamientos_count: 1,
    });

    if (insertError) { alert('Error guardando mascota. Intenta de nuevo.'); setSubmitting(false); return; }

    // Registrar avistamiento inicial con la ubicación de publicación
    const { data: nueva } = await supabase
      .from('mascotas')
      .select('id')
      .eq('image', imageUrls[0])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (nueva?.id) {
      await fetch('/api/avistamientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mascota_id: nueva.id,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          location: location || null,
          imagen: imageUrls[0],
          inicial: true,
        }),
      });
    }

    setShowDupModal(false);
    setSubmitted(true);
    setTimeout(() => router.push('/'), 2500);
  };

  // Registra avistamiento en mascota existente
  const linkToExisting = async (mascotaId: number) => {
    setSubmitting(true);
    let imageUrl = previews[0] ?? null;
    if (files[0]) {
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${files[0].name}`;
      const { error } = await supabase.storage.from('mascotas-images').upload(filename, files[0]);
      if (!error) {
        const { data } = supabase.storage.from('mascotas-images').getPublicUrl(filename);
        imageUrl = data.publicUrl;
      }
    }
    await fetch('/api/avistamientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mascota_id: mascotaId,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        location: location || null,
        imagen: imageUrl,
      }),
    });
    setShowDupModal(false);
    setSubmitted(true);
    setTimeout(() => router.push('/'), 2500);
  };

  const handleSubmit = async () => {
    if (!files.length) return;

    // Verificar duplicados primero
    setCheckingDups(true);
    const resized = await resizeImage(previews[0], 800);
    const dups = await checkDuplicates(resized);
    setCheckingDups(false);

    if (dups.length > 0) {
      setDupMatches(dups);
      setShowDupModal(true);
      return;
    }

    // Sin duplicados → publicar directo
    publishNew();
  };

  const hasPhotos = previews.length > 0;

  return (
    <main suppressHydrationWarning>
      {/* Modal de duplicados */}
      {showDupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2 text-orange-500 mb-1">
                <AlertTriangle size={18} />
                <span className="font-semibold text-sm">Posible mascota ya publicada</span>
              </div>
              <p className="text-xs text-gray-400">
                La IA encontró mascotas similares. ¿Es alguna de estas la misma?
              </p>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {dupMatches.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <img src={m.image} alt={m.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#1a1a2e] text-sm">{m.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {m.location}
                    </div>
                    <div className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
                      <Eye size={10} /> {m.similitud}% similitud
                    </div>
                    <p className="text-xs text-gray-400 italic mt-0.5 truncate">{m.razon}</p>
                  </div>
                  <button
                    onClick={() => linkToExisting(m.id)}
                    disabled={submitting}
                    className="shrink-0 bg-orange-500 text-white text-xs px-3 py-2 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    Sí, es esta
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDupModal(false)}
                className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={publishNew}
                disabled={submitting}
                className="flex-1 bg-[#1a1a2e] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition disabled:opacity-50"
              >
                {submitting ? 'Publicando...' : 'No, es diferente'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a2e] mb-2">
          {mode === 'adopcion' ? 'Dar en adopción mi mascota' : 'Reportar mascota'}
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          {mode === 'adopcion'
            ? 'Completa los datos de tu mascota para encontrarle un nuevo hogar'
            : 'Saca una foto y la IA detectará automáticamente el tipo, raza y edad'}
        </p>

        {submitted ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4"><CheckCircle size={64} className="text-green-500" /></div>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2">
              ¡{(mode === 'calle' ? (form.raza || form.tipo) : (adoptForm.raza || adoptForm.tipo)) || 'Mascota'} publicado!
            </h2>
            <p className="text-gray-400 text-sm">Redirigiendo al catálogo...</p>
          </div>
        ) : mode === 'elegir' ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode('calle')}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:border-orange-300 hover:shadow-md transition"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3"><Camera size={24} className="text-orange-500" /></div>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Vi una mascota en la calle</h2>
              <p className="text-gray-400 text-sm">Reporta una mascota callejera. La IA detectará su raza y características.</p>
            </button>
            <button
              onClick={() => setMode('adopcion')}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:border-orange-300 hover:shadow-md transition"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3"><Home size={24} className="text-orange-500" /></div>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Quiero dar en adopción mi mascota</h2>
              <p className="text-gray-400 text-sm">Publica tu mascota para encontrarle un nuevo hogar. Tú ingresas sus datos.</p>
            </button>
          </div>
        ) : mode === 'adopcion' ? (
          <>
            <button onClick={() => setMode('elegir')} className="text-gray-400 text-sm mb-6 flex items-center gap-1"><ArrowLeft size={16} /> Volver</button>

            {/* Inputs ocultos */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFirstPhoto} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFirstPhoto} />
            <input ref={extraRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraPhotos} />

            {!hasPhotos ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center mb-6">
                <div className="flex justify-center mb-4"><Camera size={48} className="text-gray-300" /></div>
                <p className="text-gray-300 text-xs mb-5">Sube fotos de tu mascota</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium">Sacar foto</button>
                  <button type="button" onClick={() => galleryRef.current?.click()} className="flex-1 border border-orange-500 text-orange-500 rounded-xl py-3 text-sm font-medium">Subir imagen</button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-2">Toca una foto para hacerla principal</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square" onClick={() => makeMain(i)}>
                      <img src={src} className={`w-full h-full object-cover rounded-xl ${i === 0 ? 'ring-2 ring-orange-500' : 'opacity-80'}`} alt={`foto ${i + 1}`} />
                      {i === 0 ? <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">⭐ Principal</span>
                        : <span className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">Hacer principal</span>}
                      <button onClick={(e) => { e.stopPropagation(); removePhoto(i); }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => extraRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                    <span className="text-2xl">+</span><span className="text-[10px]">Agregar</span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6">
              <p className="text-xs font-medium text-orange-500 mb-4 flex items-center gap-1"><PenLine size={13} /> Datos de tu mascota</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Nombre de la mascota', key: 'nombre', placeholder: 'Ej: Firulais' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input value={adoptForm[f.key as keyof typeof adoptForm]} onChange={(e) => setAdoptForm({ ...adoptForm, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Tipo de animal</label>
                  <select value={adoptForm.tipo} onChange={(e) => setAdoptForm({ ...adoptForm, tipo: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }}>
                    <option value="">Seleccionar</option>
                    <option value="Perro">Perro</option>
                    <option value="Gato">Gato</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                {[
                  { label: 'Raza', key: 'raza', placeholder: 'Ej: Labrador, Mestizo' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input value={adoptForm[f.key as keyof typeof adoptForm]} onChange={(e) => setAdoptForm({ ...adoptForm, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Sexo</label>
                  <select value={adoptForm.sexo} onChange={(e) => setAdoptForm({ ...adoptForm, sexo: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }}>
                    <option value="">Seleccionar</option>
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                    <option value="No lo sé">No lo sé</option>
                  </select>
                </div>
                {[
                  { label: 'Edad', key: 'edad', placeholder: 'Ej: 2 años, Cachorro' },
                  { label: 'Color', key: 'color', placeholder: 'Ej: Café con blanco' },
                  { label: 'Descripción', key: 'descripcion', placeholder: 'Cuéntanos sobre su personalidad...' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input value={adoptForm[f.key as keyof typeof adoptForm]} onChange={(e) => setAdoptForm({ ...adoptForm, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                  </div>
                ))}
              </div>

              <p className="text-xs font-medium text-orange-500 mt-5 mb-4 flex items-center gap-1"><Phone size={13} /> Tus datos de contacto</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Tu nombre', key: 'contactoNombre', placeholder: 'Nombre completo' },
                  { label: 'Teléfono', key: 'telefono', placeholder: '+56 9 xxxx xxxx' },
                  { label: 'Email', key: 'email', placeholder: 'tu@email.com' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input value={adoptForm[f.key as keyof typeof adoptForm]} onChange={(e) => setAdoptForm({ ...adoptForm, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1"><MapPin size={11} /> Ubicación</label>
                <div className="flex gap-2">
                  <input value={locationReady ? location : ''} onChange={(e) => setLocation(e.target.value)} placeholder={locationReady ? '' : 'Obteniendo ubicación...'} className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                  <button type="button" onClick={getLocation} className="text-xs px-3 py-2 rounded-lg bg-orange-100 text-orange-600 flex items-center"><MapPin size={14} /></button>
                </div>
              </div>
            </div>

            {hasPhotos && (
              <button onClick={handleAdoptSubmit} disabled={submitting} className="w-full bg-orange-500 text-white py-4 rounded-xl font-medium hover:bg-orange-600 transition disabled:opacity-60 touch-manipulation" style={{ fontSize: '16px' }}>
                {submitting ? 'Publicando...' : 'Publicar en catálogo'}
              </button>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setMode('elegir')} className="text-gray-400 text-sm mb-6 flex items-center gap-1"><ArrowLeft size={16} /> Volver</button>

            {/* Inputs ocultos */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFirstPhoto} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFirstPhoto} />
            <input ref={extraRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraPhotos} />

            {!hasPhotos ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center mb-6">
                <div className="flex justify-center mb-4"><Camera size={48} className="text-gray-300" /></div>
                <p className="text-gray-300 text-xs mb-5">La IA detectará raza, especie y edad</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium">Sacar foto</button>
                  <button type="button" onClick={() => galleryRef.current?.click()} className="flex-1 border border-orange-500 text-orange-500 rounded-xl py-3 text-sm font-medium">Subir imagen</button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                {/* Grid de fotos */}
                <p className="text-xs text-gray-400 mb-2">Toca una foto para hacerla principal</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square" onClick={() => makeMain(i)}>
                      <img src={src} className={`w-full h-full object-cover rounded-xl ${i === 0 ? 'ring-2 ring-orange-500' : 'opacity-80'}`} alt={`foto ${i + 1}`} />
                      {i === 0 ? (
                        <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">⭐ Principal</span>
                      ) : (
                        <span className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">Hacer principal</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >✕</button>
                    </div>
                  ))}
                  {/* Botón agregar más */}
                  <button
                    type="button"
                    onClick={() => extraRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-orange-400 transition"
                  >
                    <span className="text-2xl">+</span>
                    <span className="text-[10px]">Agregar</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400">{previews.length} foto{previews.length > 1 ? 's' : ''} seleccionada{previews.length > 1 ? 's' : ''}</p>
              </div>
            )}

            {analyzing && (
              <div className="flex items-center gap-3 text-orange-500 text-sm mb-6">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
                Analizando con IA...
              </div>
            )}

            {hasPhotos && !analyzing && (
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6">
                <p className="text-xs font-medium text-orange-500 mb-4 flex items-center gap-1">
                  {form.tipo ? <><Sparkles size={13} /> Detectado por IA — edita si es necesario</> : <><PenLine size={13} /> Completa los datos de la mascota</>}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[{ label: 'Tipo de animal', key: 'tipo' }, { label: 'Raza', key: 'raza' }, { label: 'Edad aprox.', key: 'edad' }, { label: 'Color', key: 'color' }].map((f) => (
                    <div key={f.key}>
                      <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                      <input value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                    </div>
                  ))}
                </div>
                <div className="mb-3">
                  <label className="text-xs text-gray-400 block mb-1">Descripción</label>
                  <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1"><MapPin size={11} /> Ubicación</label>
                  <div className="flex gap-2">
                    <input value={locationReady ? location : ''} onChange={(e) => setLocation(e.target.value)} placeholder={locationReady ? '' : 'Obteniendo ubicación...'} className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange-400" style={{ fontSize: '16px' }} />
                    <button type="button" onClick={getLocation} className="text-xs px-3 py-2 rounded-lg bg-orange-100 text-orange-600 flex items-center"><MapPin size={14} /></button>
                  </div>
                </div>
              </div>
            )}

            {hasPhotos && !analyzing && (
              <button onClick={handleSubmit} disabled={submitting || checkingDups} className="w-full bg-orange-500 text-white py-4 rounded-xl font-medium hover:bg-orange-600 transition disabled:opacity-60 touch-manipulation" style={{ fontSize: '16px' }}>
                {checkingDups ? 'Verificando duplicados...' : submitting ? 'Publicando...' : 'Publicar en catálogo'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
