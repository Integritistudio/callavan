// sections/ForgotPasswordModal/ForgotPasswordModal.jsx
'use client';
import { useState } from 'react';
import { requestPasswordReset, verifyResetOtp, resetPassword } from '@/lib/api';
import { showNotification } from '@/components/ui/ToastManager';

export default function ForgotPasswordModal({ onClose, onBackToLogin }) {
  // steps: 'email' | 'otp' | 'password'
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  
  // Data
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Errors
  const [errors, setErrors] = useState({ email: '', otp: '', password: '' });

  async function handleSendEmail(e) {
    e.preventDefault();
    if (!email.trim()) {
      setErrors({ ...errors, email: 'Email Address is required.' });
      return;
    }
    setErrors({ ...errors, email: '' });
    setLoading(true);
    try {
      await requestPasswordReset(email);
      showNotification('If this email is registered, an OTP has been sent.', false);
      setStep('otp');
    } catch (err) {
      setErrors({ ...errors, email: err.message || 'Failed to send OTP.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!otp.trim()) {
      setErrors({ ...errors, otp: 'OTP is required.' });
      return;
    }
    setErrors({ ...errors, otp: '' });
    setLoading(true);
    try {
      await verifyResetOtp(email, otp);
      setStep('password');
    } catch (err) {
      setErrors({ ...errors, otp: err.message || 'Invalid OTP.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    let newErrors = { ...errors, password: '' };
    
    // 1. Password mix of letters and numbers validation (Frontend UX)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;
    if (newPassword.length < 6 || newPassword.length > 64 || !passwordRegex.test(newPassword)) {
      newErrors.password = 'Password must be 6-64 chars and contain a mix of letters and numbers.';
    } else if (newPassword !== confirmPassword) {
      newErrors.password = 'Passwords do not match.';
    }

    if (newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      showNotification('Password reset successfully!', false);
      onBackToLogin(); // Go back to login so they can log in
    } catch (err) {
      setErrors({ ...errors, password: err.message || 'Failed to reset password.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-[450px] rounded-2xl shadow-xl overflow-hidden p-8 relative animate-modal-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <button onClick={onClose} className="absolute top-4 right-5 text-gray-600 hover:text-black text-2xl font-bold cursor-pointer">×</button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {step === 'email' && 'Reset Password'}
            {step === 'otp' && 'Enter OTP'}
            {step === 'password' && 'New Password'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'email' && "Enter your email to receive a reset code."}
            {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
            {step === 'password' && "Create a new strong password."}
          </p>
        </div>

        {/* Forms */}
        {step === 'email' && (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1052c9] focus:border-transparent outline-none transition-all text-gray-900 font-medium" 
                placeholder="driver@example.com"
                disabled={loading}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.email}</p>}
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1052c9] hover:bg-[#0c42a5] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-6 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="text-center mt-6">
              <span className="text-gray-500 text-sm font-medium">Remembered your password? </span>
              <button type="button" onClick={onBackToLogin} className="text-[#1052c9] font-bold text-sm hover:underline hover:text-[#0c42a5] cursor-pointer">Back to Login</button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5 uppercase tracking-wide">6-Digit OTP</label>
              <input 
                type="text" 
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (errors.otp) setErrors({ ...errors, otp: '' });
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1052c9] focus:border-transparent outline-none transition-all text-gray-900 font-medium tracking-widest text-center" 
                placeholder="123456"
                maxLength={6}
                disabled={loading}
              />
              {errors.otp && <p className="text-red-500 text-xs mt-1.5 font-semibold text-center">{errors.otp}</p>}
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1052c9] hover:bg-[#0c42a5] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-6 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="text-center mt-6">
              <button type="button" onClick={() => setStep('email')} className="text-gray-500 font-bold text-sm hover:underline cursor-pointer">Change Email</button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5 uppercase tracking-wide">New Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1052c9] focus:border-transparent outline-none transition-all text-gray-900 font-medium pr-12" 
                  placeholder="Enter password"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-wider cursor-pointer">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1052c9] focus:border-transparent outline-none transition-all text-gray-900 font-medium pr-12" 
                  placeholder="Confirm new password"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-wider cursor-pointer">
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-2 font-semibold">{errors.password}</p>}
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1bb54f] hover:bg-[#169b42] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-6 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
