// components/ui/UserLocationMarker.jsx
// Mirrors Flutter's UserLocationMarkerWidget — blue dot for customer position

export default function UserLocationMarker({ onClick }) {
  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: 40, height: 40 }}
    >
      {/* Outer pulse */}
      <div className="absolute rounded-full bg-blue-400/30 animate-ping" style={{ width: 36, height: 36 }} />
      {/* White ring */}
      <div className="absolute rounded-full bg-white shadow-md" style={{ width: 24, height: 24 }} />
      {/* Blue center */}
      <div className="absolute rounded-full bg-blue-600" style={{ width: 14, height: 14 }} />
    </div>
  );
}
