// sections/LoginModal/LoginModal.jsx
// Matches callavan.live Driver Login modal exactly

'use client';
import { useState } from 'react';
import { loginDriver } from '@/lib/api';
import { showNotification } from '@/components/ui/ToastManager';

export default function LoginModal({ onClose, onLoginSuccess, onSignUpPressed, onPendingApproval }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      showNotification('Email and password are required.', true);
      return;
    }
    setLoading(true);
    try {
      const data = await loginDriver({ email, password });
      if (data.status === 'pending') {
        onClose();
        onPendingApproval(email);
        return;
      }
      showNotification('Login successful! Going live...');
      onLoginSuccess(data.token, data.driver);
      onClose();
    } catch (err) {
      showNotification(err.message || 'Login failed.', true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-8 relative animate-modal-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Driver Portal</h2>
            <div className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block">
              Status : Offline
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-xl font-bold p-1">✕</button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all"
              required
            />
            <div className="text-right mt-2">
              <a href="#" className="text-xs text-blue-600 hover:underline font-medium">Forgot Password?</a>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold py-3.5 px-6 rounded-lg text-center mt-2 transition-colors disabled:opacity-70"
          >
            {loading ? 'Logging in...' : 'Go Live'}
          </button>
        </form>

        {/* Sign Up link */}
        <div className="text-center mt-6">
          <span className="text-sm text-gray-600">New to the platform? </span>
          <button
            onClick={() => { onClose(); onSignUpPressed(); }}
            className="text-sm text-blue-600 hover:underline font-bold"
          >
            Sign Up as a Driver
          </button>
        </div>

        {/* Footer Notice */}
        <div className="flex items-start gap-2 mt-8 pt-4 border-t border-gray-100 text-[10px] text-gray-400 leading-relaxed">
          <span>🔒</span>
          <p>By logging in, you agree to broadcast your live location to customers seeking van services nearby. Ensure your vehicle is ready for jobs.</p>
        </div>
      </div>
    </div>
  );
}
