'use client';

function detectDeviceClient() {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  return `${isMobile ? 'Mobile' : 'Desktop'} · ${os}`;
}

/**
 * Fire-and-forget web analytics (Next.js only).
 */
export function trackEvent(event, meta = {}) {
  if (typeof window === 'undefined') return;

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      userType: meta.userType || 'guest',
      userEmail: meta.userEmail || '',
      driverEmail: meta.driverEmail || '',
      device: detectDeviceClient(),
    }),
    keepalive: true,
  }).catch(() => {});
}
