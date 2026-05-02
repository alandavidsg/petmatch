'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Pet = {
  id: number;
  name: string;
  type: string;
  breed: string;
  image: string;
  location: string;
  urgente: boolean;
  lat: number | null;
  lng: number | null;
};

type Props = {
  pets: Pet[];
};

export default function MapClient({ pets }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Fix default icon paths broken by bundlers
    // @ts-expect-error - leaflet internal
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Center on Santiago, Chile by default
    const map = L.map(mapRef.current, {
      center: [-33.45, -70.67],
      zoom: 11,
      zoomControl: true,
    });

    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const petsWithCoords = pets.filter((p) => p.lat != null && p.lng != null);

    if (petsWithCoords.length === 0) return;

    const bounds: [number, number][] = [];

    petsWithCoords.forEach((pet) => {
      const lat = pet.lat as number;
      const lng = pet.lng as number;
      bounds.push([lat, lng]);

      const urgentColor = pet.urgente ? '#ef4444' : '#f97316';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:44px; height:44px; border-radius:50%; overflow:hidden;
            border:3px solid ${urgentColor}; box-shadow:0 2px 8px rgba(0,0,0,0.25);
            background:#fff;
          ">
            <img src="${pet.image}" style="width:100%;height:100%;object-fit:cover;" />
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -26],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:160px;">
          <img src="${pet.image}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
          <div style="font-weight:600;font-size:15px;color:#1a1a2e;">${pet.name}</div>
          <div style="font-size:12px;color:#9ca3af;margin:2px 0;">${pet.breed}</div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">📍 ${pet.location}</div>
          ${pet.urgente ? '<div style="font-size:11px;color:#ef4444;font-weight:600;margin-bottom:8px;">🚨 Adopción urgente</div>' : ''}
          <a href="/mascota/${pet.id}" style="display:block;background:#f97316;color:white;text-align:center;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500;text-decoration:none;">Ver mascota</a>
        </div>
      `, { maxWidth: 200 });
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [pets]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
