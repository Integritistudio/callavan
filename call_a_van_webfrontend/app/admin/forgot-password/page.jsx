'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminForgotPassword, adminVerifyOtp, adminResetPassword } from '@/lib/adminApi';
import { Mail, KeyRound, CheckCircle2, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify & Reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      await adminForgotPassword(email);
      setSuccessMsg('A 6-digit verification code has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await adminVerifyOtp(email, otp);
      await adminResetPassword(email, otp, newPassword);
      setSuccessMsg('Your password has been successfully reset.');
      setStep(3); // success stage
    } catch (err) {
      setError(err.message || 'Verification or password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 bg-slate-50 min-h-screen">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Banner header */}
        <div className="bg-[#0b51c1] px-8 py-8 text-center flex flex-col items-center justify-center relative">
          <a 
            href="/admin/login" 
            className="absolute left-4 top-4 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Back to login"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <h2 className="text-white text-xl font-bold tracking-tight">Reset Password</h2>
          <p className="text-blue-100 text-xs mt-1">Regain access to your admin account</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-semibold flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && step !== 3 && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Email to request OTP */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="admin@callavan.live"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send Verification OTP'
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Input OTP & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center tracking-widest font-mono text-lg py-3 rounded-xl border border-slate-200 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters with letter & number"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto shadow-sm">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-slate-900 font-bold text-lg">Password Reset Complete!</h3>
                <p className="text-slate-500 text-sm mt-2">Your admin password has been updated successfully.</p>
              </div>
              <button
                onClick={() => router.push('/admin/login')}
                className="w-full bg-[#0b51c1] hover:bg-[#083a8c] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/10 cursor-pointer"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
