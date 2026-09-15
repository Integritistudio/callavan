'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { hasValidCoords } from '@/lib/adminApi';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

const MapPickerInner = dynamic(() => import('./MapPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  label = 'Offline location',
  hint = 'Click the map to place the pin, or enter coordinates manually.',
}) {
  const [latInput, setLatInput] = useState(latitude != null ? String(latitude) : '');
  const [lngInput, setLngInput] = useState(longitude != null ? String(longitude) : '');
  const useMap = Boolean(MAPBOX_TOKEN);

  useEffect(() => {
    setLatInput(latitude != null && latitude !== '' ? String(latitude) : '');
    setLngInput(longitude != null && longitude !== '' ? String(longitude) : '');
  }, [latitude, longitude]);

  const parsed = useMemo(() => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!hasValidCoords(lat, lng)) return null;
    return { latitude: lat, longitude: lng };
  }, [latInput, lngInput]);

  const pushCoords = (lat, lng) => {
    setLatInput(String(lat));
    setLngInput(String(lng));
    onChange?.({ latitude: lat, longitude: lng });
  };

  const onManualBlur = () => {
    if (parsed) onChange?.(parsed);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#0b51c1]" />
          {label}
        </p>
        <p className="text-xs text-slate-400 mt-1">{hint}</p>
      </div>

      {useMap ? (
        <MapPickerInner
          latitude={parsed?.latitude}
          longitude={parsed?.longitude}
          onPick={pushCoords}
        />
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Map picker unavailable (no Mapbox token). Enter latitude and longitude below.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onBlur={onManualBlur}
            placeholder="55.8642"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            onBlur={onManualBlur}
            placeholder="-4.2518"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
          />
        </div>
      </div>
    </div>
  );
}
