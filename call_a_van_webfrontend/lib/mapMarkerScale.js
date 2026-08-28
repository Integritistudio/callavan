/** Smooth van marker scale based on map zoom (full size at zoom 14+). */
const BASE_MARKER_SCALE = 0.88;

export function getVanMarkerScale(zoom) {
  const baseZoom = 14;
  const minZoom = 9;
  const maxZoom = 18;
  const minScale = 0.36;
  const maxScale = 1;

  const z = Math.min(maxZoom, Math.max(minZoom, zoom));

  let scale;
  if (z <= baseZoom) {
    const t = (z - minZoom) / (baseZoom - minZoom);
    scale = minScale + (1 - minScale) * t;
  } else {
    scale = maxScale;
  }

  return scale * BASE_MARKER_SCALE;
}
