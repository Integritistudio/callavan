// components/ui/StatusCapsule.jsx
// Mirrors Flutter's StatusCapsule widget — bottom center pill showing driver count or status

export default function StatusCapsule({ isDriverMode, isDriverLive, onlineDriversList }) {
  const liveCount = onlineDriversList.filter(
    (d) => d.isLive === true || d.isLive === 1 || d.isLive === 'true'
  ).length;

  if (isDriverMode && isDriverLive) {
    return (
      <div className="status-capsule">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
        <span className="text-green-600">You are LIVE</span>
      </div>
    );
  }

  if (isDriverMode && !isDriverLive) {
    return (
      <div className="status-capsule">
        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
        <span className="text-gray-600">You are Offline</span>
      </div>
    );
  }

  // Customer mode
  return (
    <div className="status-capsule">
      <span className="text-[#1565C0] font-bold">{liveCount}</span>
      <span className="text-gray-600">
        {liveCount === 1 ? 'Driver Live Nearby' : 'Drivers Live Nearby'}
      </span>
    </div>
  );
}
