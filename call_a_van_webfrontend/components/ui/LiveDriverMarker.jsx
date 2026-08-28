// components/ui/LiveDriverMarker.jsx
// Mirrors Flutter's RadarAnimationMarker — live green/orange pulsing van

import { getVanMarkerScale } from '@/lib/mapMarkerScale';

const ICON_SIZE = 32;
const CONTAINER_SIZE = 64;

export default function LiveDriverMarker({ isOrange = false, zoom = 14, onClick }) {
  const color = isOrange ? '#f97316' : '#22c55e';
  const ringColor = isOrange ? 'rgba(249, 115, 22, 0.85)' : 'rgba(34, 197, 94, 0.85)';
  const scale = getVanMarkerScale(zoom);

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      style={{
        width: CONTAINER_SIZE,
        height: CONTAINER_SIZE,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.25s ease-out',
      }}
      onClick={onClick}
    >
      {[1, 2].map((i) => (
        <div
          key={i}
          className={`radar-ring radar-ring-${i} absolute pointer-events-none`}
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            border: `2px solid ${ringColor}`,
            backgroundColor: 'transparent',
          }}
        />
      ))}
      <div
        className="relative flex items-center justify-center rounded-full z-10"
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          backgroundColor: color,
          border: '2px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </div>
    </div>
  );
}
