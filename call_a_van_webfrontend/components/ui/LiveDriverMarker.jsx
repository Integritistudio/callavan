// components/ui/LiveDriverMarker.jsx
// Mirrors Flutter's RadarAnimationMarker — live green/orange pulsing van (~18% larger than offline)

import {
  getVanMarkerScale,
  VAN_ICON_SIZE,
  VAN_SVG_SIZE,
  VAN_BORDER,
  VAN_SHADOW,
  LIVE_MARKER_CONTAINER,
  LIVE_MARKER_SCALE_BOOST,
} from '@/lib/mapMarkerScale';

export default function LiveDriverMarker({ isOrange = false, zoom = 14, onClick }) {
  const color = isOrange ? '#f97316' : '#22c55e';
  const ringColor = isOrange ? 'rgba(249, 115, 22, 0.9)' : 'rgba(34, 197, 94, 0.9)';
  const scale = getVanMarkerScale(zoom, { live: true });
  const iconSize = Math.round(VAN_ICON_SIZE * LIVE_MARKER_SCALE_BOOST);
  const svgSize = Math.round(VAN_SVG_SIZE * LIVE_MARKER_SCALE_BOOST);
  // Base zoom scale only — size boost already applied to iconSize
  const zoomScale = scale / LIVE_MARKER_SCALE_BOOST;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      style={{
        width: LIVE_MARKER_CONTAINER,
        height: LIVE_MARKER_CONTAINER,
        transform: `scale(${zoomScale})`,
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
            width: iconSize,
            height: iconSize,
            border: `2.5px solid ${ringColor}`,
            backgroundColor: 'transparent',
          }}
        />
      ))}
      <div
        className="relative flex items-center justify-center rounded-full z-10"
        style={{
          width: iconSize,
          height: iconSize,
          backgroundColor: color,
          border: VAN_BORDER,
          boxShadow: VAN_SHADOW,
        }}
      >
        <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="white">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </div>
    </div>
  );
}
