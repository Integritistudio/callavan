/** Smooth van marker scale based on map zoom (full size at zoom 14+). */
export function getVanMarkerScale(zoom) {
  const baseZoom = 14;
  const minZoom = 9;
  const maxZoom = 18;
  const minScale = 0.36;
  const maxScale = 1; // never grow larger than base size when zoomed in

  const z = Math.min(maxZoom, Math.max(minZoom, zoom));

  if (z <= baseZoom) {
    const t = (z - minZoom) / (baseZoom - minZoom);
    return minScale + (1 - minScale) * t;
  }

  // Zoomed in past street level — stay at base size (avoids huge vans)
  return maxScale;
}
