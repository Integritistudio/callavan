// components/ui/OfflineDriverMarker.jsx
// Mirrors Flutter's OfflineDriverMarker — grey circle for offline drivers

import { getVanMarkerScale } from '@/lib/mapMarkerScale';

export default function OfflineDriverMarker({ zoom = 14, onClick }) {
  const scale = getVanMarkerScale(zoom);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center rounded-full cursor-pointer z-10"
      style={{
        width: 48,
        height: 48,
        backgroundColor: '#9ca3af',
        border: '2.5px solid white',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.25s ease-out',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
      </svg>
    </div>
  );
}
