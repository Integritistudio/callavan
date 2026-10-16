/** Shared van marker sizing — offline baseline; live markers slightly larger. */
export const VAN_ICON_SIZE = 48;
export const VAN_SVG_SIZE = 24;
/** Live vans ~15% larger than offline grey vans (easier to spot as available). */
export const LIVE_MARKER_SCALE_BOOST = 1.15;
export const VAN_BORDER = '2.5px solid white';
export const VAN_SHADOW = '0 3px 8px rgba(0,0,0,0.3)';
/**
 * Layout/hitbox size for markers — match the visible icon.
 * Radar rings overflow visually and must stay pointer-events: none.
 */
export const LIVE_MARKER_CONTAINER = VAN_ICON_SIZE;
export const OFFLINE_MARKER_CONTAINER = VAN_ICON_SIZE;
/** Max visual reach of pulsing radar rings. */
export const RADAR_RING_MAX_SCALE = 1.65;

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
export function getVanMarkerScale(zoom, { live = false } = {}) {
  const baseZoom = 14;
  const minZoom = 9;
  const maxZoom = 18;
  const minScale = 0.42;
  const maxScale = 1;

  const z = Math.min(maxZoom, Math.max(minZoom, zoom));

  let scale;
  if (z <= baseZoom) {
    const t = (z - minZoom) / (baseZoom - minZoom);
    scale = minScale + (maxScale - minScale) * t;
  } else {
    scale = maxScale;
  }

  return live ? scale * LIVE_MARKER_SCALE_BOOST : scale;
}

/** Haversine distance in miles between two lat/lng points. */
export function distanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.7613; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const NEARBY_RADIUS_MILES = 20;

/**
 * Zoom level when a driver goes live / map centers on them.
 * Mapbox camera max is 22 — values above that are clamped and look like "no change".
 */
export const DRIVER_LIVE_ZOOM = 16;
export const MAP_MAX_ZOOM = 22;
