// components/ui/LiveDriverMarker.jsx
// Mirrors Flutter's RadarAnimationMarker — live green pulsing van

export default function LiveDriverMarker({ isOrange = false }) {
  const color = isOrange ? '#FB8C00' : '#1AB451';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 90, height: 90 }}>
      {/* Three pulsing radar rings */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`radar-ring radar-ring-${i} absolute`}
          style={{
            width: 44,
            height: 44,
            border: `2px solid ${color}`,
            opacity: 0.6,
          }}
        />
      ))}
      {/* White circle background */}
      <div
        className="relative flex items-center justify-center rounded-full z-10"
        style={{
          width: 38,
          height: 38,
          backgroundColor: 'white',
          border: `3px solid ${color}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        🚐
      </div>
    </div>
  );
}
