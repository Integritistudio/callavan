const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function adminLogin(email, password) {
  const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export async function adminForgotPassword(email) {
  const res = await fetch(`${BACKEND_URL}/api/admin/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP code');
  return data;
}

export async function adminVerifyOtp(email, otp) {
  const res = await fetch(`${BACKEND_URL}/api/admin/verify-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid or expired OTP');
  return data;
}

export async function adminResetPassword(email, otp, newPassword) {
  const res = await fetch(`${BACKEND_URL}/api/admin/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reset password');
  return data;
}

export async function adminChangePassword(token, currentPassword, newPassword) {
  const res = await fetch(`${BACKEND_URL}/api/admin/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update password');
  return data;
}

export async function fetchDrivers(token) {
  const res = await fetch(`${BACKEND_URL}/api/admin/drivers`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch drivers list');
  return data.drivers || [];
}

export async function fetchDriverDetails(token, id) {
  const res = await fetch(`${BACKEND_URL}/api/admin/drivers/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch driver details');
  return data.driver;
}

export async function updateDriverApproval(token, id, isApproved) {
  const res = await fetch(`${BACKEND_URL}/api/admin/drivers/${id}/approval`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isApproved }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update approval status');
  return data;
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
