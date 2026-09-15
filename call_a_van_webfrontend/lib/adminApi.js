const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

async function adminFetch(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export async function adminLogin(email, password) {
  return adminFetch('/api/admin/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function adminForgotPassword(email) {
  return adminFetch('/api/admin/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function adminVerifyOtp(email, otp) {
  return adminFetch('/api/admin/verify-reset-token', {
    method: 'POST',
    body: { email, otp },
  });
}

export async function adminResetPassword(email, otp, newPassword) {
  return adminFetch('/api/admin/reset-password', {
    method: 'POST',
    body: { email, otp, newPassword },
  });
}

export async function adminChangePassword(token, currentPassword, newPassword) {
  return adminFetch('/api/admin/change-password', {
    token,
    method: 'PUT',
    body: { currentPassword, newPassword },
  });
}

export async function fetchDrivers(token) {
  const data = await adminFetch('/api/admin/drivers', { token });
  return data.drivers || [];
}

export async function fetchDriverDetails(token, id) {
  const data = await adminFetch(`/api/admin/drivers/${id}`, { token });
  return data.driver;
}

export async function updateDriverApproval(token, id, isApproved) {
  return adminFetch(`/api/admin/drivers/${id}/approval`, {
    token,
    method: 'PUT',
    body: { isApproved },
  });
}

export async function updateDriverLiveStatus(token, id, isLive) {
  return adminFetch(`/api/admin/drivers/${id}/live`, {
    token,
    method: 'PUT',
    body: { isLive },
  });
}

export async function updateDriverOfflineLocation(token, id, offlineLatitude, offlineLongitude) {
  return adminFetch(`/api/admin/drivers/${id}/offline-location`, {
    token,
    method: 'PUT',
    body: { offlineLatitude, offlineLongitude },
  });
}

export async function updateDriverDetails(token, id, payload) {
  return adminFetch(`/api/admin/drivers/${id}`, {
    token,
    method: 'PUT',
    body: payload,
  });
}

export async function fetchAdminInsights(token) {
  const data = await adminFetch('/api/admin/insights', { token });
  return data.insights;
}

export function hasValidCoords(lat, lng) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (Number.isNaN(la) || Number.isNaN(ln)) return false;
  if (la === 0 && ln === 0) return false;
  return la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

export function driverHasLocation(driver) {
  if (!driver) return false;
  return (
    hasValidCoords(driver.latitude, driver.longitude) ||
    hasValidCoords(driver.offlineLatitude, driver.offlineLongitude)
  );
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getCorrectImageUrl(rawUrl) {
  if (!rawUrl) return '';
  const backendUrl = BACKEND_URL;
  if (rawUrl.startsWith('http')) {
    try {
      return rawUrl
        .replace('localhost:5000', new URL(backendUrl).host)
        .replace('127.0.0.1:5000', new URL(backendUrl).host);
    } catch (e) {
      return rawUrl;
    }
  }
  const separator = rawUrl.startsWith('/') ? '' : '/';
  return `${backendUrl}${separator}${rawUrl}`;
}
