/** Shared van marker sizing — keep live & offline consistent. */
export const VAN_ICON_SIZE = 44;
export const VAN_SVG_SIZE = 20;
export const VAN_BORDER = '2.5px solid white';
export const VAN_SHADOW = '0 3px 8px rgba(0,0,0,0.3)';
/** Room for radar rings pulsing to 2.5× icon size */
export const LIVE_MARKER_CONTAINER = Math.round(VAN_ICON_SIZE * 2.5);

/** Smooth van marker scale based on map zoom (full size at zoom 14+). */
export function getVanMarkerScale(zoom) {
  const baseZoom = 14;
  const minZoom = 9;
  const maxZoom = 18;
  const minScale = 0.42;
  const maxScale = 1;

  const z = Math.min(maxZoom, Math.max(minZoom, zoom));

  if (z <= baseZoom) {
    const t = (z - minZoom) / (baseZoom - minZoom);
    return minScale + (maxScale - minScale) * t;
  }

  return maxScale;
}
