// components/ui/DriverProfileDetailsModal.jsx
// Public "View More" driver details — bio, company, services + call

import { getCorrectImageUrl } from '@/lib/api';

function parseServices(driver) {
  const raw = driver?.servicesOffered ?? driver?.services;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw.trim() ? [raw] : [];
    }
  }
  return [];
}

export default function DriverProfileDetailsModal({ driver, onClose, onCall }) {
  const name = driver.fullName?.includes('@')
    ? driver.fullName.split('@')[0]
    : (driver.fullName || 'Driver');
  const profileUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;
  const services = parseServices(driver);
  const phone = driver.mobileNumber || driver.phoneNumber || '';
  const shortBio = String(driver.shortBio ?? driver.short_bio ?? '').trim();
  const isLive = driver.isLive === true || driver.isLive === 1 || driver.isLive === 'true';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl shadow-xl border border-gray-200 relative animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0b51c1] pt-6 pb-6 px-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl font-light cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="w-20 h-20 rounded-full border-4 border-white shadow-md mx-auto overflow-hidden bg-white flex items-center justify-center">
            {profileUrl ? (
              <img src={profileUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-gray-400">👤</span>
            )}
          </div>

          <h2 className="text-white font-bold text-xl mt-3">{name}</h2>
          <span
            className={`inline-block mt-2 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
              isLive ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-white/15 text-white/90'
            }`}
          >
            {isLive ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">📞</div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{phone || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">🏢</div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Company</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{driver.companyName || 'Independent'}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">📍</div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Base Area</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{driver.baseArea || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">🚐</div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vehicle Type</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{driver.vehicleType || 'Van'}</p>
              </div>
            </div>
          </div>

          {shortBio ? (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 mb-4">
              <div className="text-blue-600 text-lg mt-0.5 flex-shrink-0">📝</div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Short Bio</p>
                <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{shortBio}</p>
              </div>
            </div>
          ) : null}

          {services.length > 0 ? (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-600 text-lg">⚙️</span>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Services Offered</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {typeof onCall === 'function' && phone ? (
            <button
              type="button"
              onClick={() => onCall(phone, driver)}
              className="w-full bg-[#2E7D32] hover:bg-[#256629] text-white rounded-lg h-11 flex items-center justify-center gap-2 cursor-pointer font-bold text-sm shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call a Driver
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
