// sections/ProfileModal/ProfileModal.jsx
// Mirrors Flutter's DriverProfileDialog widget

'use client';
import { useState } from 'react';
import { updateDriverProfile, changeDriverPassword, logoutDriver, getCorrectImageUrl } from '@/lib/api';
import { showNotification } from '@/components/ui/ToastManager';

const VEHICLE_TYPES = ['Luton Van', 'Transit Van', 'Sprinter', 'Pickup Truck', 'Box Truck', 'Other'];
const SERVICES_LIST = ['House Removals', 'Office Removals', 'Single Item', 'IKEA Pickup', 'eBay Delivery', 'Airport Runs', 'Man & Van', 'Furniture Assembly'];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileModal({ driver, token, onClose, onLogout, onProfileUpdated }) {
  const [tab, setTab] = useState('view'); // 'view' | 'edit' | 'password'
  const [form, setForm] = useState({ ...driver });
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileBase64, setProfileBase64] = useState(null);
  const [profileName, setProfileName] = useState(null);
  const [vanPreview, setVanPreview] = useState(null);
  const [vanBase64, setVanBase64] = useState(null);
  const [vanName, setVanName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleService(s) {
    const list = Array.isArray(form.servicesOffered) ? form.servicesOffered : [];
    setField('servicesOffered', list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);
  }

  async function handleImagePick(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    const preview = URL.createObjectURL(file);
    if (type === 'profile') { setProfileBase64(b64); setProfileName(file.name); setProfilePreview(preview); }
    else { setVanBase64(b64); setVanName(file.name); setVanPreview(preview); }
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await updateDriverProfile(token, driver.id, {
        ...form,
        profileImageBase64: profileBase64,
        profileImageName: profileName,
        vanImageBase64: vanBase64,
        vanImageName: vanName,
      });
      showNotification('Profile updated successfully!');
      onProfileUpdated(data.driver);
      onClose();
    } catch (err) {
      showNotification(err.message || 'Update failed.', true);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showNotification('Both fields are required.', true);
      return;
    }
    setLoading(true);
    try {
      await changeDriverPassword(token, driver.id, { currentPassword, newPassword });
      showNotification('Password changed successfully!');
      setCurrentPassword(''); setNewPassword('');
      setTab('view');
    } catch (err) {
      showNotification(err.message || 'Password change failed.', true);
    } finally {
      setLoading(false);
    }
  }

  const displayName = driver.fullName?.includes('@') ? driver.fullName.split('@')[0] : (driver.fullName || 'Driver');
  const profileUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;
  const services = Array.isArray(form.servicesOffered) ? form.servicesOffered : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-4">
          {['view', 'edit', 'password'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold capitalize transition-all border-b-2 ${
                tab === t ? 'border-[#1565C0] text-[#1565C0]' : 'border-transparent text-gray-400'
              }`}
            >
              {t === 'view' ? '👤 Profile' : t === 'edit' ? '✏️ Edit' : '🔒 Password'}
            </button>
          ))}
          <button onClick={onClose} className="px-3 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* ── VIEW TAB ── */}
        {tab === 'view' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-100 shadow-md bg-blue-50 flex items-center justify-center">
                {profileUrl ? (
                  <img src={profileUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>
              <h3 className="font-bold text-xl mt-3 text-gray-900">{displayName}</h3>
              <p className="text-sm text-gray-500">{driver.email}</p>
              <span
                className="mt-2 px-3 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}
              >
                {driver.vehicleType || 'Driver'}
              </span>
            </div>

            <div className="space-y-2">
              {[
                { icon: '📞', label: 'Mobile', value: driver.mobileNumber },
                { icon: '🏢', label: 'Company', value: driver.companyName },
                { icon: '📍', label: 'Base Area', value: driver.baseArea },
              ].map(({ icon, label, value }) =>
                value ? (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                    <span>{icon}</span>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </div>
                  </div>
                ) : null
              )}
              {driver.shortBio && (
                <div className="px-4 py-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Bio</p>
                  <p className="text-sm text-gray-700 italic">"{driver.shortBio}"</p>
                </div>
              )}
            </div>

            {/* Van photo */}
            {driver.vanImageUrl && (
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Van Photo</p>
                <div className="h-36 rounded-xl overflow-hidden">
                  <img src={getCorrectImageUrl(driver.vanImageUrl)} alt="Van" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <button
              onClick={() => { onLogout(); onClose(); }}
              className="w-full py-3 rounded-xl font-bold text-red-600 border-2 border-red-200 hover:bg-red-50 transition-all text-sm"
            >
              🚪 Logout
            </button>
          </div>
        )}

        {/* ── EDIT TAB ── */}
        {tab === 'edit' && (
          <form onSubmit={handleSave} className="space-y-3">
            {/* Profile photo picker */}
            <div className="flex justify-center">
              <label className="cursor-pointer relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-100 bg-blue-50 flex items-center justify-center">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : profileUrl ? (
                    <img src={profileUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">👤</span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: '#1565C0' }}>✏️</div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'profile')} />
              </label>
            </div>

            {[
              { label: 'Full Name', key: 'fullName' },
              { label: 'Mobile Number', key: 'mobileNumber' },
              { label: 'Company Name', key: 'companyName' },
              { label: 'Base Area / City', key: 'baseArea' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
                <input
                  value={form[key] || ''}
                  onChange={(e) => setField(key, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1565C0] transition-all"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Type</label>
              <select
                value={form.vehicleType || ''}
                onChange={(e) => setField('vehicleType', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1565C0] transition-all"
              >
                <option value="">Select type</option>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Short Bio</label>
              <textarea
                value={form.shortBio || ''}
                onChange={(e) => setField('shortBio', e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1565C0] transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Services Offered</label>
              <div className="flex flex-wrap gap-2">
                {SERVICES_LIST.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleService(s)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                      services.includes(s)
                        ? 'bg-[#1565C0] text-white border-[#1565C0]'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Van image */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Van Photo</label>
              <label className="block cursor-pointer">
                <div className="h-32 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 flex items-center justify-center overflow-hidden hover:border-[#1565C0] transition-all">
                  {vanPreview ? (
                    <img src={vanPreview} alt="Van" className="h-full w-full object-cover" />
                  ) : driver.vanImageUrl ? (
                    <img src={getCorrectImageUrl(driver.vanImageUrl)} alt="Van" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400"><div className="text-2xl">🚐</div><p className="text-xs">Tap to upload</p></div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'van')} />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 active:scale-95 transition-all"
              style={{ backgroundColor: '#1565C0' }}
            >
              {loading ? 'Saving...' : '💾 Save Changes'}
            </button>
          </form>
        )}

        {/* ── PASSWORD TAB ── */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <p className="text-xs text-gray-500 text-center">Enter your current password and set a new one.</p>
            {[
              { label: 'Current Password', value: currentPassword, set: setCurrentPassword },
              { label: 'New Password', value: newPassword, set: setNewPassword },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1565C0] transition-all"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 active:scale-95 transition-all"
              style={{ backgroundColor: '#1565C0' }}
            >
              {loading ? 'Changing...' : '🔒 Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
