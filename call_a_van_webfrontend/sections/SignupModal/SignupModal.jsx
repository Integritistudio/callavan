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

function Field({ label, required, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all"
      {...props}
    />
  );
}

export default function SignupModal({ onClose }) {
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
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-y-auto max-h-[85vh] p-6 relative animate-modal-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold text-gray-900">Join the Fleet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-xl font-bold p-1">✕</button>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Fill in your details to start your journey with Driver App.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full / Display Name" required>
                <Input placeholder="John Doe" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
              </Field>
              <Field label="Mobile Number" required>
                <Input placeholder="07123456789" value={form.mobileNumber} onChange={(e) => setField('mobileNumber', e.target.value)} />
              </Field>
              <Field label="Email Address" required>
                <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </Field>
              <Field label="Password" required>
                <Input type="password" placeholder="********" value={form.password} onChange={(e) => setField('password', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Professional Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Vehicle & Professional Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company Name">
                <Input placeholder="S&C Services" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} />
              </Field>
              <Field label="Base Area" required>
                <Input placeholder="e.g. Glasgow" value={form.baseArea} onChange={(e) => setField('baseArea', e.target.value)} />
              </Field>
            </div>
            
            <Field label="Vehicle Type" required>
              <select
                value={form.vehicleType}
                onChange={(e) => setField('vehicleType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none bg-white"
              >
                <option value="">Select vehicle type...</option>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>

            <label className="flex items-start gap-3 mt-4 mb-6 cursor-pointer group">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 w-4 h-4 text-[#003366] rounded focus:ring-[#003366]" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">I confirm I am fully insured and operating legally <span className="text-red-500">*</span></span>
            </label>

            <Field label="Short Bio (Optional)">
              <textarea
                placeholder="Briefly describe your experience or vehicle..."
                value={form.shortBio}
                onChange={(e) => setField('shortBio', e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#003366] outline-none resize-none"
              />
            </Field>

            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">Services Offered (Optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICES_LIST.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                    <input
                      type="checkbox"
                      checked={form.servicesOffered.includes(s)}
                      onChange={() => toggleService(s)}
                      className="rounded text-[#003366] focus:ring-[#003366]"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* File Uploads */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">File Uploads</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Profile Image" required>
                <div className="flex items-center gap-3">
                  <label className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                    Choose File
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'profile')} />
                  </label>
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">
                    {profileImageName || 'No file chosen'}
                  </span>
                </div>
              </Field>
              <Field label="Van Image" required>
                <div className="flex items-center gap-3">
                  <label className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                    Choose File
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, 'van')} />
                  </label>
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">
                    {vanImageName || 'No file chosen'}
                  </span>
                </div>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto mx-auto block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-10 rounded-lg mt-8 transition-colors disabled:opacity-70"
          >
            {loading ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
