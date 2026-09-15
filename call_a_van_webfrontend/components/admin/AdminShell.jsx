'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Users,
  BarChart3,
  Activity,
  LogOut,
  Lock,
  X,
  Check,
  AlertCircle,
  Loader2,
  Menu,
  Shield,
} from 'lucide-react';
import { adminChangePassword } from '@/lib/adminApi';

const NAV = [
  { id: 'drivers', label: 'Drivers', href: '/admin', icon: Users },
  { id: 'insights', label: 'Insights', href: '/admin?tab=insights', icon: BarChart3 },
  { id: 'analytics', label: 'Analytics', href: '/admin?tab=analytics', icon: Activity },
];

function tabFromHref(id) {
  if (id === 'insights') return '/admin?tab=insights';
  if (id === 'analytics') return '/admin?tab=analytics';
  return '/admin';
}

export default function AdminShell({
  children,
  adminEmail,
  token,
  activeTab = 'drivers',
  onTabChange,
  toastMessage,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    router.push('/admin/login');
  };

  const handleNav = (item) => {
    setSidebarOpen(false);
    if (pathname === '/admin' && onTabChange) {
      onTabChange(item.id);
      router.replace(tabFromHref(item.id));
      return;
    }
    router.push(item.href);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      await adminChangePassword(token, currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1200);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-800 flex">
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-5 py-3.5 rounded-lg shadow-lg border text-sm ${
            toastMessage.type === 'success'
              ? 'bg-white border-green-200 text-green-800'
              : 'bg-white border-red-200 text-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0b51c1] text-white flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 border-b border-white/10">
          <img
            src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69d5648b03176e73b702b52f_callvan1.png"
            alt="Call-A-Van"
            className="h-8 object-contain cursor-pointer"
            onClick={() => handleNav(NAV[0])}
          />
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-blue-100/80 font-semibold flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Admin Panel
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === 'drivers'
                ? pathname?.startsWith('/admin/driver') ||
                  (pathname === '/admin' && activeTab === 'drivers')
                : pathname === '/admin' && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-[#0b51c1]'
                    : 'text-blue-50 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          <div className="px-2 mb-2">
            <p className="text-[10px] uppercase tracking-wider text-blue-100/70 font-bold">Signed in</p>
            <p className="text-sm font-semibold truncate" title={adminEmail}>
              {adminEmail || 'Administrator'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            Change password
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-red-500/90 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-slate-900 truncate">
              {pathname?.startsWith('/admin/driver')
                ? 'Driver details'
                : activeTab === 'insights'
                  ? 'Fleet insights'
                  : activeTab === 'analytics'
                    ? 'Website analytics'
                    : 'Driver management'}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Call-A-Van operations console
            </p>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 py-6">{children}</main>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0b51c1] px-5 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Change admin password
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {[
                ['Current password', currentPassword, setCurrentPassword],
                ['New password', newPassword, setNewPassword],
                ['Confirm new password', confirmPassword, setConfirmPassword],
              ].map(([label, value, setter]) => (
                <div key={label}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {label}
                  </label>
                  <input
                    type="password"
                    required
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="block w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-[#0b51c1] hover:bg-[#083a8c] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
