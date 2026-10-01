/** Shared van marker sizing — keep live & offline consistent. */
export const VAN_ICON_SIZE = 58;
export const VAN_SVG_SIZE = 28;
export const VAN_BORDER = '2.5px solid white';
export const VAN_SHADOW = '0 3px 8px rgba(0,0,0,0.3)';
/**
 * Layout/hitbox size for markers — match the visible icon.
 * Radar rings overflow visually and must stay pointer-events: none.
 */
export const LIVE_MARKER_CONTAINER = VAN_ICON_SIZE;
/** Max visual reach of pulsing radar rings (2.5× icon). */
export const RADAR_RING_MAX_SCALE = 2.5;

/** Marker stacking within Mapbox — selected popup must sit above neighbors. */
export const MARKER_Z_DEFAULT = 1;
export const MARKER_Z_USER = 2;
export const MARKER_Z_OWN = 5;
export const MARKER_Z_HOVER = 20;
export const MARKER_Z_SELECTED = 30;

/** Resolve marker stack order for public-map driver pins. */
export function getDriverMarkerZIndex({ isSelected = false, isHovered = false } = {}) {
  if (isSelected) return MARKER_Z_SELECTED;
  if (isHovered) return MARKER_Z_HOVER;
  return MARKER_Z_DEFAULT;
}

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
