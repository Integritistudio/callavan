// components/ui/OfflineDriverMarker.jsx
// Mirrors Flutter's DriverMarker widget — grey circle for offline drivers

export default function OfflineDriverMarker({ isOrange = false, onClick }) {
  const color = isOrange ? '#FB8C00' : '#1AB451';

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: 48, height: 48 }}
    >
      {/* Outer shadow ring */}
      <div className="absolute rounded-full bg-black/10" style={{ width: 44, height: 44 }} />
      {/* White ring */}
      <div className="absolute rounded-full bg-white" style={{ width: 30, height: 30 }} />
      {/* Colored center */}
      <div
        className="absolute rounded-full flex items-center justify-center text-xs"
        style={{ width: 18, height: 18, backgroundColor: color }}
      >
        <span style={{ fontSize: 10 }}>🚐</span>
      </div>
    </div>
  );
}
