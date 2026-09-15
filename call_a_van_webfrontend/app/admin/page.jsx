'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchDrivers,
  updateDriverApproval,
  updateDriverLiveStatus,
  fetchAdminInsights,
  fetchWebAnalytics,
  driverHasLocation,
  getCorrectImageUrl,
} from '@/lib/adminApi';
import AdminShell from '@/components/admin/AdminShell';
import InsightsPanel from '@/components/admin/InsightsPanel';
import AnalyticsPanel from '@/components/admin/AnalyticsPanel';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Radio,
} from 'lucide-react';

function tabFromSearchParams(searchParams) {
  const tab = searchParams.get('tab');
  if (tab === 'insights' || tab === 'analytics') return tab;
  return 'drivers';
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = tabFromSearchParams(searchParams);

  const [token, setToken] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [insights, setInsights] = useState(null);
  const [webAnalytics, setWebAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [togglingLiveId, setTogglingLiveId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedEmail = localStorage.getItem('admin_email');
    if (!savedToken) {
      router.push('/admin/login');
      return;
    }
    setToken(savedToken);
    setAdminEmail(savedEmail || 'Administrator');
    loadDrivers(savedToken);
  }, [router]);

  useEffect(() => {
    setActiveTab(tabFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'insights') loadInsights(token);
    if (activeTab === 'analytics') loadAnalytics(token);
  }, [activeTab, token]);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadDrivers = async (authToken) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDrivers(authToken || token);
      setDrivers(data);
    } catch (err) {
      setError(err.message || 'Failed to load drivers.');
      if (/auth|token|denied/i.test(err.message || '')) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async (authToken) => {
    setInsightsLoading(true);
    try {
      const fleet = await fetchAdminInsights(authToken || token);
      setInsights(fleet);
    } catch (err) {
      showToast('error', err.message || 'Failed to load insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadAnalytics = async (authToken) => {
    setAnalyticsLoading(true);
    try {
      const web = await fetchWebAnalytics(authToken || token);
      setWebAnalytics(web);
    } catch (err) {
      showToast('error', err.message || 'Failed to load analytics.');
      setWebAnalytics({ counts: {}, events: [], totalEvents: 0 });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleStatusToggle = async (driverId, currentApprovedState) => {
    const targetApprovedState = !currentApprovedState;
    try {
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, isApproved: targetApprovedState } : d))
      );
      const res = await updateDriverApproval(token, driverId, targetApprovedState);
      showToast('success', res.message || 'Driver status updated.');
      const freshDrivers = await fetchDrivers(token);
      setDrivers(freshDrivers);
    } catch (err) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, isApproved: currentApprovedState } : d))
      );
      showToast('error', err.message || 'Failed to update approval status.');
    }
  };

  const handleLiveToggle = async (driver) => {
    const isApproved = driver.isApproved === true || driver.isApproved === 1;
    const isOnline = isApproved && (driver.locationLive === true || driver.isLive === true);
    const nextLive = !isOnline;

    if (nextLive && !driverHasLocation(driver)) {
      showToast('error', 'Set coordinates (offline location) before making this driver live.');
      router.push(`/admin/driver/${driver.id}`);
      return;
    }

    if (!isApproved) {
      showToast('error', 'Approve the driver before setting them live.');
      return;
    }

    setTogglingLiveId(driver.id);
    try {
      const res = await updateDriverLiveStatus(token, driver.id, nextLive);
      showToast('success', res.message || (nextLive ? 'Driver is live.' : 'Driver is offline.'));
      const freshDrivers = await fetchDrivers(token);
      setDrivers(freshDrivers);
      if (activeTab === 'insights') loadInsights(token);
    } catch (err) {
      showToast('error', err.message || 'Failed to update live status.');
    } finally {
      setTogglingLiveId(null);
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
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
    const isApproved = driver.isApproved === true || driver.isApproved === 1;
    if (statusFilter === 'APPROVED') return isApproved;
    if (statusFilter === 'PENDING') return !isApproved;
    if (statusFilter === 'LIVE') return isApproved && (driver.locationLive === true || driver.isLive === true);
    if (statusFilter === 'MISSING_LOC') return !driverHasLocation(driver);
    return true;
  });

  const totalCount = drivers.length;
  const approvedCount = drivers.filter((d) => d.isApproved === true || d.isApproved === 1).length;
  const pendingCount = totalCount - approvedCount;
  const liveCount = drivers.filter(
    (d) => (d.isApproved === true || d.isApproved === 1) && (d.locationLive === true || d.isLive === true)
  ).length;

  return (
    <AdminShell
      adminEmail={adminEmail}
      token={token}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      toastMessage={toastMessage}
    >
      {activeTab === 'insights' ? (
        <InsightsPanel insights={insights} loading={insightsLoading} />
      ) : activeTab === 'analytics' ? (
        <AnalyticsPanel
          webAnalytics={webAnalytics}
          loading={analyticsLoading}
          onRefresh={() => loadAnalytics(token)}
        />
      ) : (
        <div className="space-y-5">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total', value: totalCount, icon: Users, tone: 'text-[#0b51c1] bg-blue-50' },
              { label: 'Pending', value: pendingCount, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
              { label: 'Approved', value: approvedCount, icon: UserCheck, tone: 'text-green-600 bg-green-50' },
              { label: 'Live', value: liveCount, icon: Radio, tone: 'text-teal-600 bg-teal-50' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white rounded-xl border border-slate-200 px-4 py-4 flex items-center gap-3 shadow-sm"
                >
                  <div className={`p-2.5 rounded-lg ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                    <p className="text-xl font-extrabold text-slate-900">{loading ? '…' : card.value}</p>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, email, phone, company…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-0.5 overflow-x-auto">
                  {[
                    { label: 'All', value: 'ALL' },
                    { label: 'Pending', value: 'PENDING' },
                    { label: 'Approved', value: 'APPROVED' },
                    { label: 'Live', value: 'LIVE' },
                    { label: 'No location', value: 'MISSING_LOC' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setStatusFilter(tab.value)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap cursor-pointer ${
                        statusFilter === tab.value
                          ? 'bg-[#0b51c1] text-white'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => loadDrivers()}
                  disabled={loading}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {error && (
              <div className="px-5 py-3 bg-red-50 text-red-700 text-sm font-semibold flex items-center gap-2 border-b border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0b51c1]" />
                  <p className="text-sm font-medium">Loading drivers…</p>
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No drivers found</p>
                  <p className="text-sm mt-1">Try a different search or filter.</p>
                </div>
              ) : (
                <table className="w-full text-left min-w-[920px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Driver</th>
                      <th className="py-3 px-5">Contact</th>
                      <th className="py-3 px-5">Company</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-center">Live</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredDrivers.map((driver) => {
                      const isApproved = driver.isApproved === true || driver.isApproved === 1;
                      const isOnline =
                        isApproved && (driver.locationLive === true || driver.isLive === true);
                      const hasLoc = driverHasLocation(driver);
                      const profileUrl = driver.profileImageUrl
                        ? getCorrectImageUrl(driver.profileImageUrl)
                        : null;

                      return (
                        <tr key={driver.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                {profileUrl ? (
                                  <img src={profileUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-slate-400 text-sm font-bold">
                                    {(driver.fullName || '?').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate max-w-[180px]">
                                  {driver.fullName || 'No name'}
                                </p>
                                <p className="text-xs text-slate-400 truncate max-w-[180px]">{driver.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-medium text-slate-700">
                            {driver.mobileNumber || '—'}
                          </td>
                          <td className="py-3.5 px-5">
                            <p className="font-semibold text-slate-700 truncate max-w-[140px]">
                              {driver.companyName || 'Independent'}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[140px]">
                              {driver.vehicleType || '—'}
                            </p>
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Pending
                              </span>
                            )}
                            {!hasLoc && (
                              <p className="text-[10px] font-bold text-rose-500 mt-1">No location</p>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              type="button"
                              disabled={!isApproved || togglingLiveId === driver.id}
                              onClick={() => handleLiveToggle(driver)}
                              title={
                                !isApproved
                                  ? 'Approve first'
                                  : !hasLoc && !isOnline
                                    ? 'Set coordinates first'
                                    : isOnline
                                      ? 'Set offline'
                                      : 'Set live'
                              }
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                  isOnline ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <p className="text-[10px] font-bold mt-1 text-slate-400">
                              {togglingLiveId === driver.id ? '…' : isOnline ? 'Live' : 'Offline'}
                            </p>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/admin/driver/${driver.id}`)}
                                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Details
                              </button>
                              {isApproved ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusToggle(driver.id, true)}
                                  className="px-2.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Disapprove
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStatusToggle(driver.id, false)}
                                  className="px-2.5 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Approve
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
        </div>
      )}
    </AdminShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f3f5f9] text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#0b51c1]" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
