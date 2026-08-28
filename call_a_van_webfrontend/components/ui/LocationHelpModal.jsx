'use client';

import { isSecureContext } from '@/lib/geolocation';

export default function LocationHelpModal({ onClose, onTryAgain }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-[420px] rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0b51c1] px-5 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Enable Location</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none cursor-pointer">×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {!isSecureContext() ? (
            <p className="text-sm text-gray-700 leading-relaxed">
              Location requires a secure connection (HTTPS). Open this site via HTTPS or localhost, then try again.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-700 leading-relaxed">
                The browser blocked location for this site. To allow it, update your site permissions:
              </p>
              <ol className="text-sm text-gray-800 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Tap the <strong>lock / info icon</strong> in the address bar</li>
                <li>Open <strong>Site settings</strong> or <strong>Permissions</strong></li>
                <li>Set <strong>Location</strong> to <strong>Allow</strong></li>
                <li>Come back here and tap <strong>Try Again</strong></li>
              </ol>
              <p className="text-xs text-gray-500 leading-relaxed">
                On mobile: browser menu → Settings → Site settings → Location → Allow for this site.
              </p>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onTryAgain}
              className="flex-1 bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3 rounded-lg cursor-pointer transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
