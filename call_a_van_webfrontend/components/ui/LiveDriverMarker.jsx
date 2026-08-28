// components/ui/LiveDriverMarker.jsx
// Mirrors Flutter's RadarAnimationMarker — live green/orange pulsing van

import { getVanMarkerScale } from '@/lib/mapMarkerScale';

export default function LiveDriverMarker({ isOrange = false, zoom = 14, onClick }) {
  const color = isOrange ? '#f97316' : '#22c55e';
  const ringColor = isOrange ? 'rgba(249, 115, 22, 1)' : 'rgba(34, 197, 94, 1)';
  const scale = getVanMarkerScale(zoom);

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      style={{
        width: 96,
        height: 96,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.25s ease-out',
      }}
      onClick={onClick}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`radar-ring radar-ring-${i} absolute pointer-events-none`}
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${ringColor}`,
            backgroundColor: 'transparent',
          }}
        />
      ))}
      <div
        className="relative flex items-center justify-center rounded-full z-10"
        style={{
          width: 40,
          height: 40,
          backgroundColor: color,
          border: '2px solid white',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </div>
    </div>
  );
}
