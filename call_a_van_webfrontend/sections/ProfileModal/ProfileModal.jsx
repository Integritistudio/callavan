// sections/ProfileModal/ProfileModal.jsx
// Mirrors Flutter's DriverProfileDialog widget

'use client';
import { useState, useEffect } from 'react';
import { updateDriverProfile, logoutDriver, getCorrectImageUrl } from '@/lib/api';
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

function Field({ label, required, children, noMargin }) {
  return (
    <div className={noMargin ? '' : 'mb-4'}>
      <label className="block text-sm font-bold text-gray-900 mb-1">
        {label} {required && <span className="text-gray-900">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      className={`w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all ${
        props.readOnly || props.disabled 
          ? 'bg-gray-200 opacity-70 cursor-not-allowed text-gray-500' 
          : 'bg-[#f4f7fb]'
      }`}
      {...props}
    />
  );
}

export default function ProfileModal({ driver, token, onClose, onLogout, onProfileUpdated }) {
  const [viewState, setViewState] = useState('view'); // 'view' | 'edit'
  const [form, setForm] = useState({ ...driver });
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileBase64, setProfileBase64] = useState(null);
  const [profileName, setProfileName] = useState(null);
  const [vanPreview, setVanPreview] = useState(null);
  const [vanBase64, setVanBase64] = useState(null);
  const [vanName, setVanName] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({ ...driver });
  }, [driver]);

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
      setProfilePreview(null);
      setProfileBase64(null);
      setProfileName(null);
      setVanPreview(null);
      setVanBase64(null);
      setVanName(null);
      setViewState('view');
    } catch (err) {
      showNotification(err.message || 'Update failed.', true);
    } finally {
      setLoading(false);
    }
  }

  const displayName = driver.fullName?.includes('@') ? driver.fullName.split('@')[0] : (driver.fullName || 'Driver');
  const profileUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;
  const services = Array.isArray(form.servicesOffered) ? form.servicesOffered : [];

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center py-[5px] px-4" onClick={onClose}>
      <div className={`bg-white w-full ${viewState === 'view' ? 'max-w-sm' : 'max-w-2xl'} rounded-2xl shadow-xl overflow-y-auto max-h-[calc(100vh-10px)] p-6 md:p-8 relative animate-modal-in [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`} onClick={(e) => e.stopPropagation()}>
        
        {/* Absolute Close Button */}
        <button onClick={onClose} className="absolute top-4 right-5 text-gray-600 hover:text-black text-2xl font-bold cursor-pointer z-10">×</button>
        
        {/* Absolute Back Button (if not view) */}
        {viewState !== 'view' && (
          <button onClick={() => setViewState('view')} className="absolute top-4 left-5 text-gray-600 hover:text-[#0b51c1] text-2xl font-bold cursor-pointer z-10">←</button>
        )}

        {/* Header */}
        <div className="text-center mb-6 mt-2">
          <h2 className="text-[26px] font-bold text-gray-900 leading-tight">
            {viewState === 'view' ? 'Driver Profile' : 'Edit Profile'}
          </h2>
          <p className="text-[14px] text-gray-600 mt-0">
            {viewState === 'view' ? 'Manage your account and vehicle details.' : 'Update your personal and professional information.'}
          </p>
        </div>

        {/* ── VIEW TAB ── */}
        {viewState === 'view' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#eef4ff] shadow-md bg-[#f4f7fb] flex items-center justify-center mb-4 text-gray-400">
                {profileUrl ? (
                  <img src={profileUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                )}
              </div>
              <h3 className="font-bold text-2xl text-gray-900">{displayName}</h3>
              <p className="text-sm font-medium text-gray-500 mb-4">{driver.email}</p>
              
              <div className="flex w-full gap-4 mt-1">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
                  <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Phone Number</span>
                  <span className="block text-sm font-bold text-gray-900">{driver.mobileNumber || 'N/A'}</span>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
                  <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Vehicle Type</span>
                  <span className="block text-sm font-bold text-[#0b51c1]">{driver.vehicleType || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => setViewState('edit')}
                className="w-full bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3 px-6 rounded-lg text-center transition-colors cursor-pointer shadow-sm"
              >
                Edit Profile
              </button>
              <button
                onClick={() => { onLogout(); onClose(); }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors cursor-pointer shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {/* ── EDIT TAB ── */}
        {viewState === 'edit' && (
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-lg font-bold text-[#0a4cbd] border-b border-gray-300 pb-1 mb-3">Personal Details</h3>
            <div className="flex justify-center mb-4">
              <label className="cursor-pointer relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#eef4ff] bg-[#f4f7fb] flex items-center justify-center shadow-sm text-gray-400">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  ) : profileUrl ? (
                    <img src={profileUrl} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  ) : (
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold">Edit</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'profile')} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Full / DisplayName" required>
                <Input placeholder="John Doe" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
              </Field>
              <Field label="Email Address" required>
                <Input type="email" placeholder="john@example.com" value={form.email} readOnly />
              </Field>
              <Field label="Mobile Number" required>
                <Input placeholder="07123456789" value={form.mobileNumber} onChange={(e) => setField('mobileNumber', e.target.value)} />
              </Field>
              <Field label="Company Name">
                <Input placeholder="LTD Name or Trading As" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} />
              </Field>
              <Field label="Base Area" required>
                <Input placeholder="e.g. Glasgow" value={form.baseArea} onChange={(e) => setField('baseArea', e.target.value)} />
              </Field>
            </div>

            <h3 className="text-lg font-bold text-[#0a4cbd] border-b border-gray-300 pb-1 mb-3 mt-4">Vehicle & Professional Info</h3>
            
            <Field label="Vehicle Type" required noMargin>
              <div className="relative mb-4">
                <select
                  value={form.vehicleType || ''}
                  onChange={(e) => setField('vehicleType', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none bg-[#f4f7fb] cursor-pointer appearance-none"
                >
                  <option value="">Vehicle Type</option>
                  {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </Field>

            <Field label="Short Bio(Optional)">
              <textarea
                placeholder="Tell us about your experience (max 200 chars)"
                value={form.shortBio || ''}
                onChange={(e) => setField('shortBio', e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full border border-gray-300 bg-[#f4f7fb] rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#003366] outline-none resize-none"
              />
            </Field>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Services Offered (Optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {SERVICES_LIST.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={services.includes(s)}
                      onChange={() => toggleService(s)}
                      className="w-4 h-4 rounded border-gray-300 text-[#0b51c1] focus:ring-[#0b51c1]"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Field label="VAN IMAGE">
                <div className="flex items-center gap-4">
                  <label className="bg-[#eef4ff] text-[#0b51c1] px-5 py-2 rounded-full text-sm font-bold cursor-pointer transition-colors hover:bg-blue-100 shrink-0">
                    Choose New File
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'van')} />
                  </label>
                  
                  {/* Small preview of current/new van image */}
                  <div className="h-12 w-20 rounded border border-gray-200 bg-[#f4f7fb] overflow-hidden flex items-center justify-center">
                    {vanPreview ? (
                      <img src={vanPreview} alt="Van" className="h-full w-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : driver.vanImageUrl ? (
                      <img src={getCorrectImageUrl(driver.vanImageUrl)} alt="Van" className="h-full w-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400 truncate flex-1">
                    {vanName || 'Keep existing van image'}
                  </span>
                </div>
              </Field>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3.5 px-6 rounded-lg text-center mt-2 transition-colors disabled:opacity-70 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
