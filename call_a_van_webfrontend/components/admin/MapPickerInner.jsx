'use client';

import { useEffect, useMemo, useState } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const DEFAULT = { latitude: 55.8642, longitude: -4.2518, zoom: 11 };

export default function MapPickerInner({ latitude, longitude, onPick }) {
  const hasPin =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  const [viewState, setViewState] = useState({
    ...DEFAULT,
    ...(hasPin
      ? { latitude: Number(latitude), longitude: Number(longitude), zoom: 12 }
      : {}),
  });

  useEffect(() => {
    if (!hasPin) return;
    setViewState((prev) => ({
      ...prev,
      latitude: Number(latitude),
      longitude: Number(longitude),
    }));
  }, [hasPin, latitude, longitude]);

  const pin = useMemo(() => {
    if (!hasPin) return null;
    return { latitude: Number(latitude), longitude: Number(longitude) };
  }, [hasPin, latitude, longitude]);

  return (
    <div className="h-64 rounded-lg overflow-hidden border border-slate-200 relative">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={(evt) => {
          const { lng, lat } = evt.lngLat;
          onPick?.(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        cursor="crosshair"
      >
        {pin && (
          <Marker latitude={pin.latitude} longitude={pin.longitude} anchor="bottom">
            <div className="text-[#0b51c1] drop-shadow">
              <MapPin className="h-7 w-7 fill-[#0b51c1] text-white" />
            </div>
          </Marker>
        )}
      </Map>
      <div className="absolute left-2 bottom-2 bg-white/95 text-[10px] font-semibold text-slate-600 px-2 py-1 rounded border border-slate-200 pointer-events-none">
        Click to set pin
      </div>
    </div>
  );
}
