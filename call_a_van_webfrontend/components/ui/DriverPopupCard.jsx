// components/ui/DriverPopupCard.jsx
// Mirrors Flutter's SelectedDriverPopupMarker — popup card shown above driver on tap

'use client';
import { getCorrectImageUrl } from '@/lib/api';

export default function DriverPopupCard({ driver, address, isDriverMode, onClose, onCall }) {
  const name = driver.fullName?.includes('@')
    ? driver.fullName.split('@')[0]
    : (driver.fullName || 'Driver');

  const isLive = driver.isLive === true || driver.isLive === 1 || driver.isLive === 'true';
  const phoneNumber = driver.mobileNumber || 'N/A';
  const profileUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;

  return (
    <div className="driver-popup">
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 280, border: '1px solid rgba(0,0,0,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b border-gray-100">
          {/* Avatar */}
          <div className="relative">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={name}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1565C0]">
                👤
              </div>
            )}
            {/* Live indicator dot */}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: isLive ? '#1AB451' : '#9E9E9E' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{name}</p>
            <p className="text-xs text-gray-500 truncate">
              {driver.companyName || driver.vehicleType || 'Van Driver'}
            </p>
          </div>

          {/* Status badge */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isLive ? '#E8F5E9' : '#F5F5F5',
              color: isLive ? '#1AB451' : '#9E9E9E',
            }}
          >
            {isLive ? 'LIVE' : 'Offline'}
          </span>

          <button
            onClick={onClose}
            className="ml-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-2">
          {/* Address */}
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <span>📍</span>
            <span className="leading-relaxed">
              {address || 'Fetching location...'}
            </span>
          </div>

          {/* Bio */}
          {driver.shortBio && (
            <div className="text-xs text-gray-500 italic">"{driver.shortBio}"</div>
          )}

          {/* Base area */}
          {driver.baseArea && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>🗺️</span>
              <span>{driver.baseArea}</span>
            </div>
          )}

          {/* Services */}
          {driver.servicesOffered?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {driver.servicesOffered.slice(0, 3).map((s, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Call button */}
        {!isDriverMode && (
          <div className="px-3 pb-3">
            <button
              onClick={() => onCall(phoneNumber)}
              className="w-full py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: '#1AB451' }}
            >
              📞 Call Driver
            </button>
          </div>
        )}
      </div>

      {/* Down-pointing triangle — centers on driver icon */}
      <div className="flex justify-center">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '10px solid white',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
          }}
        />
      </div>
    </div>
  );
}
