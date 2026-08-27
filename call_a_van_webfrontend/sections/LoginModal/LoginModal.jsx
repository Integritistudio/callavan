// sections/LoginModal/LoginModal.jsx
// Matches callavan.live Driver Login modal exactly

'use client';
import { useState } from 'react';
import { loginDriver } from '@/lib/api';
import { showNotification } from '@/components/ui/ToastManager';

export default function LoginModal({ onClose, onLoginSuccess, onSignUpPressed, onPendingApproval, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  async function handleLogin(e) {
    e.preventDefault();
    
    // Custom Validation
    let newErrors = { email: '', password: '' };
    let hasError = false;
    
    if (!email.trim()) {
      newErrors.email = 'Email Address is required.';
      hasError = true;
    }
    if (!password) {
      newErrors.password = 'Password is required.';
      hasError = true;
    }
    
    setErrors(newErrors);
    
    if (hasError) {
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
      onLoginSuccess(data.token, data.driver);
      onClose();
    } catch (err) {
      showNotification(err.message || 'Login failed.', true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-[450px] rounded-2xl shadow-xl overflow-hidden p-8 relative animate-modal-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <button onClick={onClose} className="absolute top-4 right-5 text-gray-600 hover:text-black text-2xl font-bold cursor-pointer">×</button>
        <div className="text-center mb-5 mt-2">
          <h2 className="text-[26px] font-bold text-gray-900 leading-tight">Driver Portal</h2>
          <p className="text-[14px] text-gray-600 mt-1">You are currently not visible to customers nearby.</p>
          <div className="mt-2.5 inline-block border border-red-300 bg-white rounded-full px-5 py-1.5">
            <span className="text-red-700 text-xs font-bold tracking-wider uppercase">Status : Offline</span>
          </div>
        </div>

        <form onSubmit={handleLogin} noValidate>
          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-800 mb-1">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              placeholder="john@example.com"
              className={`w-full border rounded-lg p-3 text-sm outline-none transition-all ${
                errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-[#003366] focus:border-[#003366]'
              }`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                placeholder="********"
                className={`w-full border rounded-lg p-3 pr-10 text-sm outline-none transition-all ${
                  errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-[#003366] focus:border-[#003366]'
                }`}
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
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password}</p>}
          </div>
            <div className="text-right mt-1.5 mb-3">
              <button type="button" onClick={() => { onClose(); onForgotPassword(); }} className="text-sm text-[#0b51c1] hover:underline font-medium cursor-pointer">Forgot Password?</button>
            </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3 px-6 rounded-lg text-center transition-colors disabled:opacity-70 cursor-pointer"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign Up link */}
        <div className="text-center mt-4">
          <span className="text-sm text-gray-700">New to the platform? </span>
          <button
            onClick={() => { onClose(); onSignUpPressed(); }}
            className="text-sm text-[#0b51c1] hover:underline font-bold cursor-pointer"
          >
            Sign Up as a Driver
          </button>
        </div>

        {/* Footer Notice */}
        <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
          <img src="/lockicon.png" alt="security lock" className="w-[18px] h-[18px] shrink-0 mt-0.5 object-contain" />
          <p>Your location is only shared when you are 'Live'. Your connection is encrypted and sessions are secured with bank-grade security protocols.</p>
        </div>
      </div>
    </div>
  );
}
