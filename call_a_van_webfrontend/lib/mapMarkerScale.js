/** Smooth van marker scale based on map zoom (base size at zoom 14). */
export function getVanMarkerScale(zoom) {
  const baseZoom = 14;
  const minScale = 0.4;
  const maxScale = 1.45;
  const raw = Math.pow(2, (zoom - baseZoom) * 0.36);
  return Math.min(maxScale, Math.max(minScale, raw));
}
