'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchDriverDetails, updateDriverApproval, getCorrectImageUrl } from '@/lib/adminApi';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Briefcase, 
  MapPin, 
  Truck, 
  FileText, 
  CheckCircle, 
  UserCheck, 
  UserX,
  Loader2,
  Calendar,
  Layers,
  MapIcon
} from 'lucide-react';

export default function DriverDetailPage({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { id } = params;

  const [token, setToken] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (!savedToken) {
      router.push('/admin/login');
    } else {
      setToken(savedToken);
      loadDriver(savedToken);
    }
  }, [router, id]);

  const loadDriver = async (authToken) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDriverDetails(authToken || token, id);
      setDriver(data);
    } catch (err) {
      setError(err.message || 'Failed to load driver details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!driver || updateLoading) return;
    
    setUpdateLoading(true);
    setError('');
    const targetApprovedState = !driver.isApproved;

    try {
      const res = await updateDriverApproval(token, id, targetApprovedState);
      
      // Update local state
      setDriver(prev => ({
        ...prev,
        isApproved: targetApprovedState
      }));
      
      showToast('success', res.message || `Driver status updated successfully.`);
    } catch (err) {
      showToast('error', err.message || 'Failed to update approval status.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 bg-slate-50 gap-3 text-slate-400 min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b51c1]" />
        <p className="text-sm font-medium">Fetching driver details...</p>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 text-center flex flex-col items-center justify-center gap-4 bg-slate-50 min-h-screen">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm">
          <UserX className="h-8 w-8" />
        </div>
        <h3 className="text-slate-800 font-extrabold text-lg">Error Loading Profile</h3>
        <p className="text-slate-500 text-sm max-w-md">{error || 'Driver profile was not found or is missing.'}</p>
        <button
          onClick={() => router.push('/admin')}
          className="mt-2 bg-[#0b51c1] hover:bg-[#083a8c] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Parse Services Offered
  let servicesList = [];
  if (driver.servicesOffered) {
    try {
      servicesList = typeof driver.servicesOffered === 'string' 
        ? JSON.parse(driver.servicesOffered) 
        : driver.servicesOffered;
    } catch(e) {}
  }
  if (!Array.isArray(servicesList) || servicesList.length === 0) {
    servicesList = ['General Van Services'];
  }

  const isApproved = driver.isApproved === true || driver.isApproved === 1;
  const isOnline = isApproved && (driver.locationLive === true || driver.isLive === true);
  const profileUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;
  const vanUrl = driver.vanImageUrl ? getCorrectImageUrl(driver.vanImageUrl) : null;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-4 rounded-xl shadow-xl border text-sm transition-all duration-300 animate-bounce ${
          toastMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 w-full bg-[#0b51c1] px-4 py-4 md:px-8 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/admin')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-sm"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-white text-base md:text-lg font-bold">Driver Profile Detail</h2>
          </div>
          
          <img 
            src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69d5648b03176e73b702b52f_callvan1.png" 
            alt="Call-A-Van Logo" 
            className="h-8 object-contain"
          />
        </div>
      </header>

      {/* ── PROFILE BODY ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:px-8 space-y-6">
        
        {/* Core Card (Top section) */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
            {/* Profile image with online dot indicator */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                {profileUrl ? (
                  <img src={profileUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 font-bold text-3xl">👤</span>
                )}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 block h-5 w-5 rounded-full ring-2 ring-white bg-green-500 animate-pulse"></span>
              )}
            </div>

            <div>
              <h1 className="text-xl font-extrabold text-slate-800">{driver.fullName || 'No Name'}</h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">{driver.email}</p>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Pending Approval
                  </span>
                )}

                {isOnline ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                    Online (Live on Map)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Core Action Button */}
          <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
            {isApproved ? (
              <button
                onClick={handleStatusToggle}
                disabled={updateLoading}
                className="w-full px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {updateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
                <span>Disapprove Driver</span>
              </button>
            ) : (
              <button
                onClick={handleStatusToggle}
                disabled={updateLoading}
                className="w-full px-5 py-3 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {updateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                <span>Approve & Set Live</span>
              </button>
            )}
          </div>

        </section>

        {/* Detailed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Information Section */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:col-span-2 space-y-6">
            <h3 className="text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0b51c1]" />
              Driver Details Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mobile Number</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mt-1">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{driver.mobileNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Name</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mt-1">
                  <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{driver.companyName || 'Independent Driver'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Coverage Area</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mt-1">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{driver.baseArea || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle Type</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mt-1">
                  <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{driver.vehicleType || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered On</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mt-1">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{driver.createdAt ? new Date(driver.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Last Location Update</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mt-1">
                  <MapIcon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{driver.locationLastActive ? new Date(driver.locationLastActive).toLocaleString() : 'Never'}</span>
                </div>
              </div>

            </div>

            {/* Bio */}
            <div className="space-y-1.5 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Driver Short Biography</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic mt-1.5">
                {driver.shortBio || 'No biography details provided.'}
              </p>
            </div>

          </section>

          {/* Services Panel */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            <h3 className="text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0b51c1]" />
              Services Offered
            </h3>

            <div className="space-y-3">
              {servicesList.map((service, index) => (
                <div key={index} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold text-slate-700 leading-tight">{service}</span>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Media Attachments Section */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h3 className="text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-3">
            Media Attachments & Verification Photos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Profile Photo */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Driver Profile Image</p>
              <div className="aspect-video w-full rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative shadow-sm group">
                {profileUrl ? (
                  <img 
                    src={profileUrl} 
                    alt="Driver Profile Photo" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <span className="text-3xl block mb-1">👤</span>
                    <p className="text-xs font-semibold">No profile image uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Van Photo */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Van Vehicle Image</p>
              <div className="aspect-video w-full rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative shadow-sm group">
                {vanUrl ? (
                  <img 
                    src={vanUrl} 
                    alt="Driver Van Photo" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <span className="text-3xl block mb-1">🚐</span>
                    <p className="text-xs font-semibold">No vehicle image uploaded</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

      </main>

    </div>
  );
}
