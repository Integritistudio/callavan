// src/lib/api.js
// Centralized API calls — mirrors Flutter's http calls to the same Node.js backend

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function fetchLiveDrivers() {
  const res = await fetch(`${BACKEND_URL}/api/drivers/live`);
  if (!res.ok) throw new Error('Failed to fetch live drivers');
  const data = await res.json();
  return data.drivers || [];
}

export async function loginDriver({ email, password }) {
  const res = await fetch(`${BACKEND_URL}/api/drivers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export async function signupDriver(formData) {
  const res = await fetch(`${BACKEND_URL}/api/drivers/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Signup failed');
  return data;
}

export async function logoutDriver(token) {
  await fetch(`${BACKEND_URL}/api/drivers/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateDriverProfile(token, driverId, formData) {
  const res = await fetch(`${BACKEND_URL}/api/drivers/${driverId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Update failed');
  return data;
}

export async function changeDriverPassword(token, driverId, { currentPassword, newPassword }) {
  const res = await fetch(`${BACKEND_URL}/api/drivers/${driverId}/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Password change failed');
  return data;
}

export function getCorrectImageUrl(rawUrl) {
  if (!rawUrl) return '';
  const backendUrl = BACKEND_URL;
  if (rawUrl.startsWith('http')) {
    return rawUrl
      .replace('localhost:5000', new URL(backendUrl).host)
      .replace('127.0.0.1:5000', new URL(backendUrl).host);
  }
  return `${backendUrl}${rawUrl}`;
}
