/** Shared geolocation request — must be called from a user click for the browser prompt. */

export function requestGeolocationPermission({ onSuccess, onDenied, onError, flyOptions = {} }) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.('Geolocation is not supported on this device.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onSuccess?.(pos.coords.latitude, pos.coords.longitude, pos);
    },
    (err) => {
      if (err.code === 1) {
        onDenied?.(err);
      } else if (err.code === 3) {
        onError?.('Location request timed out. Please try again.');
      } else {
        onError?.('Could not get your location. Please try again.');
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
      ...flyOptions,
    }
  );
}

/** If permission was already granted, load location silently (no prompt). */
export function loadGrantedLocation(onSuccess, onFail) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess?.(pos.coords.latitude, pos.coords.longitude),
    () => onFail?.(),
    { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
  );
}

export function isSecureContext() {
  return typeof window !== 'undefined' && window.isSecureContext;
}
