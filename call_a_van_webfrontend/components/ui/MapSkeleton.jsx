// components/ui/MapSkeleton.jsx
// Mirrors Flutter's shimmer overlay that hides the black map during initial load

export default function MapSkeleton() {
  return (
    <div className="absolute inset-0 z-10 grid" style={{ gridTemplateRows: 'repeat(10, 1fr)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="shimmer m-px" />
      ))}
    </div>
  );
}
