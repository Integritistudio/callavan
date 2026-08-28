// sections/SignupModal/SignupModal.jsx
// Matches callavan.live Driver Signup modal exactly

'use client';
import { useState } from 'react';
import { signupDriver } from '@/lib/api';
import { showNotification } from '@/components/ui/ToastManager';

const VEHICLE_TYPES = ['Luton Van', 'Transit Van', 'Sprinter', 'Pickup Truck', 'Box Truck', 'Other'];
const SERVICES_LIST = ['House Removals', 'Single Item Transport', 'Furniture Collection / Delivery', 'Storage Moves', 'Small Moves / Student Moves', 'Waste / Disposal Runs'];

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
      className="w-full border border-gray-300 bg-[#f4f7fb] rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all"
      {...props}
    />
  );
}

export default function SignupModal({ onClose, onLoadingChange }) {
  const [form, setForm] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    password: '',
    companyName: '',
    baseArea: '',
    vehicleType: '',
    shortBio: '',
    servicesOffered: [],
  });
  const [profileImageBase64, setProfileImageBase64] = useState(null);
  const [profileImageName, setProfileImageName] = useState(null);
  const [vanImageBase64, setVanImageBase64] = useState(null);
  const [vanImageName, setVanImageName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleService(service) {
    setForm((prev) => ({
      ...prev,
      servicesOffered: prev.servicesOffered.includes(service)
        ? prev.servicesOffered.filter((s) => s !== service)
        : [...prev.servicesOffered, service],
    }));
  }

  async function handleImagePick(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    if (type === 'profile') {
      setProfileImageBase64(b64);
      setProfileImageName(file.name);
    } else {
      setVanImageBase64(b64);
      setVanImageName(file.name);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!confirmed) {
      showNotification('You must confirm you are insured and operating legally.', true);
      return;
    }
    if (!form.fullName || !form.mobileNumber || !form.email || !form.password || !form.vehicleType || !profileImageBase64 || !vanImageBase64) {
      showNotification('Please fill all required fields and upload images.', true);
      return;
    }
    setLoading(true);
    onLoadingChange?.(true);
    try {
      await signupDriver({
        ...form,
        profileImageBase64,
        profileImageName,
        vanImageBase64,
        vanImageName,
      });
      showNotification('Registration submitted! Awaiting admin approval.');
      onClose();
    } catch (err) {
      showNotification(err.message || 'Signup failed.', true);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center py-[5px] px-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-y-auto max-h-[calc(100vh-10px)] p-6 md:p-8 relative animate-modal-in [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <button onClick={onClose} className="absolute top-4 right-5 text-gray-600 hover:text-black text-2xl font-bold cursor-pointer">×</button>
        <div className="text-center mb-6 mt-2">
          <h2 className="text-[26px] font-bold text-gray-900 leading-tight">Join the Fleet</h2>
          <p className="text-[14px] text-gray-600 mt-0">
            Fill in your details to start your journey with Driver App.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Details */}
          <div>
            <h3 className="text-lg font-bold text-[#0a4cbd] border-b border-gray-300 pb-1 mb-3">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Full / DisplayName" required>
                <Input placeholder="John Doe" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
              </Field>
              <Field label="Mobile Number" required>
                <Input placeholder="Used for customer calls" value={form.mobileNumber} onChange={(e) => setField('mobileNumber', e.target.value)} />
              </Field>
              <Field label="Email Address" required>
                <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </Field>
              <Field label="Password" required>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="********" 
                    value={form.password} 
                    onChange={(e) => setField('password', e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </Field>
              <Field label="Company Name" required>
                <Input placeholder="LTD Name or Trading As" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} />
              </Field>
              <Field label="Base Area" required>
                <Input placeholder="Rough town/postcode only" value={form.baseArea} onChange={(e) => setField('baseArea', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Professional Details */}
          <div>
            <h3 className="text-lg font-bold text-[#0a4cbd] border-b border-gray-300 pb-1 mb-3">Vehicle & Professional Info</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 items-center">
              <Field label="Vehicle Type" required noMargin>
                <div className="relative">
                  <select
                    value={form.vehicleType}
                    onChange={(e) => setField('vehicleType', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none bg-[#f4f7fb] cursor-pointer appearance-none"
                  >
                    <option value="" className="cursor-pointer">Vehicle Type</option>
                    {VEHICLE_TYPES.map((v) => <option key={v} value={v} className="cursor-pointer">{v}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </Field>

              <label className="flex items-start gap-2 cursor-pointer group pt-6">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 text-[#0b51c1] rounded focus:ring-[#0b51c1]" />
                <span className="text-sm font-bold text-gray-800 leading-tight">
                  I confirm I am fully insured and operating legally <span className="text-gray-800">*</span>
                </span>
              </label>
            </div>

            <Field label="Short Bio(Optional)">
              <textarea
                placeholder="Tell us about your experience (max 200 chars)"
                value={form.shortBio}
                onChange={(e) => setField('shortBio', e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full border border-gray-300 bg-[#f4f7fb] rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#003366] outline-none resize-none"
              />
            </Field>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-800 mb-2">Services Offered (Optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {SERVICES_LIST.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.servicesOffered.includes(s)}
                      onChange={() => toggleService(s)}
                      className="w-4 h-4 rounded border-gray-300 text-[#0b51c1] focus:ring-[#0b51c1]"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <Field label="PROFILE IMAGE" required>
                <div className="flex items-center gap-3">
                  <label className="bg-[#eef4ff] text-[#0b51c1] px-5 py-2 rounded-full text-sm font-bold cursor-pointer transition-colors hover:bg-blue-100">
                    Choose File
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'profile')} />
                  </label>
                  <span className="text-sm text-gray-400 truncate max-w-[120px]">
                    {profileImageName || 'No file chosen'}
                  </span>
                </div>
              </Field>
              <Field label="VAN IMAGE" required>
                <div className="flex items-center gap-3">
                  <label className="bg-[#eef4ff] text-[#0b51c1] px-5 py-2 rounded-full text-sm font-bold cursor-pointer transition-colors hover:bg-blue-100">
                    Choose File
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'van')} />
                  </label>
                  <span className="text-sm text-gray-400 truncate max-w-[120px]">
                    {vanImageName || 'No file chosen'}
                  </span>
                </div>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3.5 px-6 rounded-lg text-center mt-0 transition-colors disabled:opacity-70 cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
