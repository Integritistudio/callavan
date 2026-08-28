'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchDrivers, updateDriverApproval, adminChangePassword } from '@/lib/adminApi';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Search, 
  LogOut, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  X, 
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, APPROVED, PENDING

  // Password Change Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Notification Banner
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success'|'error', text: '' }

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedEmail = localStorage.getItem('admin_email');
    if (!savedToken) {
      router.push('/admin/login');
    } else {
      setToken(savedToken);
      setAdminEmail(savedEmail || 'Administrator');
      loadDrivers(savedToken);
    }
  }, [router]);

  const loadDrivers = async (authToken) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDrivers(authToken || token);
      setDrivers(data);
    } catch (err) {
      setError(err.message || 'Failed to load drivers.');
      if (err.message.includes('auth') || err.message.includes('token') || err.message.includes('denied')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    router.push('/admin/login');
  };

  const handleStatusToggle = async (driverId, currentApprovedState) => {
    setError('');
    const targetApprovedState = !currentApprovedState;

    try {
      // Optimistic UI update
      setDrivers(prev => prev.map(d => {
        if (d.id === driverId) {
          return { ...d, isApproved: targetApprovedState };
        }
        return d;
      }));

      const res = await updateDriverApproval(token, driverId, targetApprovedState);
      
      showToast('success', res.message || `Driver status updated successfully.`);
      // Reload from backend to make sure states align perfectly
      const freshDrivers = await fetchDrivers(token);
      setDrivers(freshDrivers);
    } catch (err) {
      // Revert optimistic update on failure
      setDrivers(prev => prev.map(d => {
        if (d.id === driverId) {
          return { ...d, isApproved: currentApprovedState };
        }
        return d;
      }));
      showToast('error', err.message || 'Failed to update approval status.');
    }
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
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter Logic
  const filteredDrivers = drivers.filter(driver => {
    const fullName = (driver.fullName || '').toLowerCase();
    const email = (driver.email || '').toLowerCase();
    const phone = (driver.mobileNumber || '').toLowerCase();
    const company = (driver.companyName || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch = 
      fullName.includes(query) || 
      email.includes(query) || 
      phone.includes(query) || 
      company.includes(query);

    if (!matchesSearch) return false;

    // Status Filter
    const isApproved = driver.isApproved === true || driver.isApproved === 1;

    if (statusFilter === 'APPROVED') return isApproved;
    if (statusFilter === 'PENDING') return !isApproved;

    return true;
  });

  // Stats Counters
  const totalCount = drivers.length;
  const approvedCount = drivers.filter(d => d.isApproved === true || d.isApproved === 1).length;
  const pendingCount = drivers.filter(d => d.isApproved === false || d.isApproved === 0).length;
  const liveCount = drivers.filter(d => (d.isApproved === true) && (d.isLive === true || d.locationLive === true)).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-4 rounded-xl shadow-xl border text-sm transition-all duration-300 animate-bounce ${
          toastMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span className="font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 w-full bg-[#0b51c1] px-4 py-4 md:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Left Brand */}
          <div className="flex items-center gap-4">
            <img 
              src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69d5648b03176e73b702b52f_callvan1.png" 
              alt="Call-A-Van Logo" 
              className="h-9 object-contain cursor-pointer"
              onClick={() => router.push('/admin')}
            />
            <div className="h-6 w-[1px] bg-white/20 hidden md:block"></div>
            <span className="text-white/80 font-bold text-xs uppercase tracking-widest hidden md:block mt-0.5">Admin Dashboard</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center justify-between md:justify-end gap-4">
            <div className="text-left md:text-right">
              <p className="text-white text-xs font-bold uppercase tracking-wider text-blue-100">Logged In As</p>
              <p className="text-white font-bold text-sm truncate max-w-[200px]" title={adminEmail}>
                {adminEmail}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="p-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 text-xs font-semibold"
                title="Change Password"
              >
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Password</span>
              </button>
              
              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl border border-white/30 bg-white/20 hover:bg-red-600 hover:border-red-600 hover:text-white text-white transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 text-xs font-semibold"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:px-8 space-y-8">
        
        {/* Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-xl bg-blue-50 text-[#0b51c1]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Drivers</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{loading ? '...' : totalCount}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider font-semibold">Pending Approval</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{loading ? '...' : pendingCount}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-xl bg-green-50 text-[#22c55e]">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Approved Drivers</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{loading ? '...' : approvedCount}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-xl bg-teal-50 text-teal-600">
              <RefreshCw className="h-6.5 w-6.5" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Live Map Drivers</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{loading ? '...' : liveCount}</p>
            </div>
          </div>

        </section>

        {/* Filters and Table Container */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          
          {/* Controls Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative max-w-md w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                type="text"
                placeholder="Search drivers by name, email, mobile, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] text-sm transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Tabs & Refresh */}
            <div className="flex items-center gap-3 overflow-x-auto self-start md:self-auto">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                {[
                  { label: 'All', value: 'ALL' },
                  { label: 'Pending', value: 'PENDING' },
                  { label: 'Approved', value: 'APPROVED' },
                ].map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      statusFilter === tab.value 
                        ? 'bg-[#0b51c1] text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => loadDrivers()}
                disabled={loading}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Refresh Drivers"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-6 bg-red-50 text-red-700 text-sm font-semibold flex items-center gap-2 border-b border-red-100">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drivers List Table */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-[#0b51c1]" />
                <p className="text-sm font-medium">Loading drivers records...</p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400 px-4">
                <Users className="h-10 w-10 text-slate-300" />
                <h4 className="text-slate-700 font-bold text-base mt-2">No Drivers Found</h4>
                <p className="text-sm max-w-sm">No drivers match your search query or selected filter criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Driver Profile</th>
                    <th className="py-4 px-6">Contact / Phone</th>
                    <th className="py-4 px-6">Company & Area</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredDrivers.map(driver => {
                    const isApproved = driver.isApproved === true || driver.isApproved === 1;
                    const isOnline = isApproved && (driver.locationLive === true || driver.isLive === true);

                    return (
                      <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* Driver Profile */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {driver.profileImageUrl ? (
                                <img 
                                  src={driver.profileImageUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => { e.target.src = ''; }}
                                />
                              ) : (
                                <span className="text-slate-400 font-bold text-base">👤</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate max-w-[180px]">
                                {driver.fullName || 'No Name'}
                              </p>
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                {driver.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="py-4 px-6 text-slate-700 font-medium">
                          {driver.mobileNumber || 'N/A'}
                        </td>

                        {/* Company & Vehicle info */}
                        <td className="py-4 px-6">
                          <p className="font-semibold text-slate-700 truncate max-w-[150px]">
                            {driver.companyName || 'Independent'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">
                            {driver.vehicleType || 'Unknown Vehicle'}
                          </p>
                        </td>

                        {/* Status Badges */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col items-center gap-1.5">
                            {/* Approval Badge */}
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-505"></span>
                                Pending Approval
                              </span>
                            )}

                            {/* Active Map Status */}
                            {isApproved && (
                              isOnline ? (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-green-500 animate-ping"></span>
                                  Online (Live Map)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  Offline
                                </span>
                              )
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Details Page Link */}
                            <button
                              onClick={() => router.push(`/admin/driver/${driver.id}`)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-bold shadow-sm"
                              title="View Details Profile"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Details</span>
                            </button>

                            {/* Approve / Disapprove Toggle button */}
                            {isApproved ? (
                              <button
                                onClick={() => handleStatusToggle(driver.id, true)}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Disapprove Driver"
                              >
                                <UserX className="h-4 w-4" />
                                <span>Disapprove</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusToggle(driver.id, false)}
                                className="px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Approve Driver"
                              >
                                <UserCheck className="h-4 w-4" />
                                <span>Approve</span>
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </section>

      </main>

      {/* ── PASSWORD UPDATE MODAL ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            
            <div className="bg-[#0b51c1] px-6 py-5 flex items-center justify-between text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Admin Password
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters, letter & number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1] transition-all bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2 bg-[#0b51c1] hover:bg-[#083a8c] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
