// components/ui/DriverProfileDetailsModal.jsx
// Matches callavan.live Driver Profile Modal for public view

import { getCorrectImageUrl } from '@/lib/api';

export default function DriverProfileDetailsModal({ driver, onClose }) {
  const name = driver.fullName?.includes('@') ? driver.fullName.split('@')[0] : (driver.fullName || 'Driver');
  const profileUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;
  const services = Array.isArray(driver.servicesOffered) ? driver.servicesOffered : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-50 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative animate-modal-in" onClick={e => e.stopPropagation()}>
        
        {/* Header (Blue Background) */}
        <div className="bg-[#0d47a1] pt-6 pb-6 px-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl font-light">✕</button>
          
          <div className="w-20 h-20 rounded-full border-4 border-white shadow-md mx-auto overflow-hidden bg-white flex items-center justify-center">
            {profileUrl ? (
              <img src={profileUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-gray-400">👤</span>
            )}
          </div>
          
          <h2 className="text-white font-bold text-xl mt-3">{name}</h2>
        </div>

        {/* Body Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">📞</div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{driver.mobileNumber || 'N/A'}</p>
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

          {/* Short Bio */}
          {driver.shortBio && (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 mb-4">
              <div className="text-blue-600 text-lg mt-0.5 flex-shrink-0">📝</div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Short Bio</p>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">{driver.shortBio}</p>
              </div>
            </div>
          )}

          {/* Services Offered */}
          {services.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-600 text-lg">⚙️</span>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Services Offered</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map((s, i) => (
                  <span key={i} className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
