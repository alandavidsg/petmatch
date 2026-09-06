'use client';

import { useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Crop as CropIcon } from 'lucide-react';

type Props = {
  /** Imagen a recortar, como data URI. El modal se muestra mientras no sea null. */
  src: string;
  onCancel: () => void;
  /** Recibe el recorte como data URI JPEG, o la imagen original si no se ajustó nada. */
  onConfirm: (base64: string) => void;
};

/**
 * Editor de recorte de una foto, en modal a pantalla completa.
 *
 * Recorte libre (sin proporción fija) con un recuadro preseleccionado al 90%,
 * para que confirmar sin tocar nada devuelva prácticamente la foto completa.
 * Lo usan el formulario de reportar y los dos flujos de mascotas perdidas.
 */
export default function PhotoCropModal({ src, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  // Genera el recorte como JPEG a partir de la selección sobre la imagen mostrada.
  // La imagen en pantalla está escalada, así que hay que llevar las coordenadas al
  // tamaño real antes de dibujar o el recorte sale corrido.
  const getCroppedBase64 = (image: HTMLImageElement, c: PixelCrop): string => {
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(c.width * scaleX);
    canvas.height = Math.round(c.height * scaleY);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      c.x * scaleX, c.y * scaleY, c.width * scaleX, c.height * scaleY,
      0, 0, canvas.width, canvas.height
    );
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Al cargar la imagen en el editor, preselecciona un recuadro centrado al 90%
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const w = width * 0.9;
    const h = height * 0.9;
    const px: PixelCrop = { unit: 'px', x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
    setCrop(px);
    setCompletedCrop(px);
  };

  const confirm = () => {
    const img = imgRef.current;
    // Un recuadro diminuto suele ser un toque accidental, no una selección real:
    // en ese caso se devuelve la foto entera en vez de un recorte inservible.
    const useCrop = img && completedCrop && completedCrop.width > 8 && completedCrop.height > 8;
    onConfirm(useCrop ? getCroppedBase64(img, completedCrop) : src);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 text-white mb-4 text-sm font-medium">
        <CropIcon size={16} /> Recorta la foto (arrastra para ajustar)
      </div>
      <div className="max-w-full max-h-[65vh] overflow-hidden flex items-center justify-center">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Recortar foto"
            onLoad={onImageLoad}
            style={{ maxHeight: '65vh', maxWidth: '100%', objectFit: 'contain' }}
          />
        </ReactCrop>
      </div>
      <div className="flex gap-3 mt-5 w-full max-w-md">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition"
        >
          Cancelar
        </button>
        <button
          onClick={confirm}
          className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 transition"
        >
          Usar foto
        </button>
      </div>
    </div>
  );
}
