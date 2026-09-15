'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchDriverDetails,
  updateDriverApproval,
  updateDriverLiveStatus,
  updateDriverOfflineLocation,
  updateDriverDetails,
  getCorrectImageUrl,
  driverHasLocation,
  hasValidCoords,
  fileToBase64,
} from '@/lib/adminApi';
import AdminShell from '@/components/admin/AdminShell';
import LocationPicker from '@/components/admin/LocationPicker';
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
  Pencil,
  Save,
  X,
  Radio,
  ImagePlus,
} from 'lucide-react';

const SERVICES_LIST = [
  'House Removals',
  'Office Removals',
  'Single Item',
  'IKEA Pickup',
  'eBay Delivery',
  'Airport Runs',
  'Man & Van',
  'Furniture Assembly',
];

function parseServices(raw) {
  if (!raw) return [];
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default function DriverDetailPage({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { id } = params;

  const [token, setToken] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [form, setForm] = useState({});
  const [offlineCoords, setOfflineCoords] = useState({ latitude: null, longitude: null });
  const [profileFile, setProfileFile] = useState(null);
  const [vanFile, setVanFile] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedEmail = localStorage.getItem('admin_email');
    if (!savedToken) {
      router.push('/admin/login');
      return;
    }
    setToken(savedToken);
    setAdminEmail(savedEmail || 'Administrator');
    loadDriver(savedToken);
  }, [router, id]);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const hydrateForm = (data) => {
    setForm({
      fullName: data.fullName || '',
      email: data.email || '',
      mobileNumber: data.mobileNumber || '',
      companyName: data.companyName || '',
      baseArea: data.baseArea || '',
      vehicleType: data.vehicleType || '',
      shortBio: data.shortBio || '',
      servicesOffered: parseServices(data.servicesOffered),
    });

    const offlineLat = hasValidCoords(data.offlineLatitude, data.offlineLongitude)
      ? parseFloat(data.offlineLatitude)
      : hasValidCoords(data.latitude, data.longitude)
        ? parseFloat(data.latitude)
        : null;
    const offlineLng = hasValidCoords(data.offlineLatitude, data.offlineLongitude)
      ? parseFloat(data.offlineLongitude)
      : hasValidCoords(data.latitude, data.longitude)
        ? parseFloat(data.longitude)
        : null;

    setOfflineCoords({ latitude: offlineLat, longitude: offlineLng });
    setProfileFile(null);
    setVanFile(null);
  };

  const loadDriver = async (authToken) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDriverDetails(authToken || token, id);
      setDriver(data);
      hydrateForm(data);
    } catch (err) {
      setError(err.message || 'Failed to load driver details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!driver || updateLoading) return;
    setUpdateLoading(true);
    const targetApprovedState = !driver.isApproved;
    try {
      const res = await updateDriverApproval(token, id, targetApprovedState);
      setDriver((prev) => ({ ...prev, isApproved: targetApprovedState }));
      showToast('success', res.message || 'Approval updated.');
      await loadDriver(token);
    } catch (err) {
      showToast('error', err.message || 'Failed to update approval.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLiveToggle = async () => {
    if (!driver || liveLoading) return;
    const isApproved = driver.isApproved === true || driver.isApproved === 1;
    const isOnline = isApproved && (driver.locationLive === true || driver.isLive === true);
    const nextLive = !isOnline;

    if (!isApproved) {
      showToast('error', 'Approve the driver before setting them live.');
      return;
    }
    if (nextLive && !driverHasLocation(driver) && !hasValidCoords(offlineCoords.latitude, offlineCoords.longitude)) {
      showToast('error', 'Set an offline location before making this driver live.');
      return;
    }

    setLiveLoading(true);
    try {
      // Persist offline pin first if admin placed one but never saved
      if (
        hasValidCoords(offlineCoords.latitude, offlineCoords.longitude) &&
        (!hasValidCoords(driver.offlineLatitude, driver.offlineLongitude) ||
          Number(driver.offlineLatitude) !== Number(offlineCoords.latitude) ||
          Number(driver.offlineLongitude) !== Number(offlineCoords.longitude))
      ) {
        await updateDriverOfflineLocation(
          token,
          id,
          offlineCoords.latitude,
          offlineCoords.longitude
        );
      }

      const res = await updateDriverLiveStatus(token, id, nextLive);
      showToast('success', res.message || (nextLive ? 'Driver is live.' : 'Driver is offline.'));
      await loadDriver(token);
    } catch (err) {
      showToast('error', err.message || 'Failed to update live status.');
    } finally {
      setLiveLoading(false);
    }
  };

  const handleSaveOfflineLocation = async () => {
    if (!hasValidCoords(offlineCoords.latitude, offlineCoords.longitude)) {
      showToast('error', 'Enter valid latitude and longitude.');
      return;
    }
    setLocLoading(true);
    try {
      const res = await updateDriverOfflineLocation(
        token,
        id,
        offlineCoords.latitude,
        offlineCoords.longitude
      );
      setDriver(res.driver);
      hydrateForm(res.driver);
      showToast('success', res.message || 'Offline location saved.');
    } catch (err) {
      showToast('error', err.message || 'Failed to save offline location.');
    } finally {
      setLocLoading(false);
    }
  };

  const toggleService = (service) => {
    setForm((prev) => {
      const list = Array.isArray(prev.servicesOffered) ? prev.servicesOffered : [];
      return {
        ...prev,
        servicesOffered: list.includes(service)
          ? list.filter((s) => s !== service)
          : [...list, service],
      };
    });
  };

  const handleSaveDetails = async () => {
    if (!form.fullName?.trim() || !form.mobileNumber?.trim()) {
      showToast('error', 'Full name and mobile number are required.');
      return;
    }

    setSaveLoading(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        mobileNumber: form.mobileNumber,
        companyName: form.companyName,
        baseArea: form.baseArea,
        vehicleType: form.vehicleType,
        shortBio: form.shortBio,
        servicesOffered: form.servicesOffered,
      };

      if (profileFile) {
        payload.profileImageBase64 = await fileToBase64(profileFile);
        payload.profileImageName = profileFile.name || 'profile.jpg';
      }
      if (vanFile) {
        payload.vanImageBase64 = await fileToBase64(vanFile);
        payload.vanImageName = vanFile.name || 'van.jpg';
      }

      const res = await updateDriverDetails(token, id, payload);
      setDriver(res.driver);
      hydrateForm(res.driver);
      setEditing(false);
      showToast('success', res.message || 'Driver details saved.');
    } catch (err) {
      showToast('error', err.message || 'Failed to save driver details.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#f3f5f9] gap-3 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-[#0b51c1]" />
        <p className="text-sm font-medium">Loading driver…</p>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f3f5f9] px-4">
        <UserX className="h-10 w-10 text-red-500" />
        <h3 className="text-slate-800 font-extrabold text-lg">Could not load profile</h3>
        <p className="text-slate-500 text-sm text-center max-w-md">{error || 'Driver not found.'}</p>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="bg-[#0b51c1] hover:bg-[#083a8c] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to drivers
        </button>
      </div>
    );
  }

  const isApproved = driver.isApproved === true || driver.isApproved === 1;
  const isOnline = isApproved && (driver.locationLive === true || driver.isLive === true);
  const profileUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;
  const vanUrl = driver.vanImageUrl ? getCorrectImageUrl(driver.vanImageUrl) : null;
  const servicesList = editing ? form.servicesOffered : parseServices(driver.servicesOffered);

  return (
    <AdminShell adminEmail={adminEmail} token={token} activeTab="drivers" toastMessage={toastMessage}>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0b51c1] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to drivers
          </button>
          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit details
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    hydrateForm(driver);
                    setEditing(false);
                  }}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveLoading}
                  onClick={handleSaveDetails}
                  className="px-3.5 py-2 bg-[#0b51c1] hover:bg-[#083a8c] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Header card */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-18 h-18 w-[4.5rem] h-[4.5rem] rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                  {profileUrl ? (
                    <img src={profileUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 font-bold text-2xl">
                      {(driver.fullName || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isOnline && (
                  <span className="absolute bottom-0.5 right-0.5 block h-4 w-4 rounded-full ring-2 ring-white bg-emerald-500" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">{driver.fullName || 'No name'}</h1>
                <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {driver.email}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      isApproved
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isApproved ? 'Approved' : 'Pending approval'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      isOnline ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isOnline ? 'Live on map' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                disabled={!isApproved || liveLoading}
                onClick={handleLiveToggle}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isOnline
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {liveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                {isOnline ? 'Set offline' : 'Set live'}
              </button>
              <button
                type="button"
                disabled={updateLoading}
                onClick={handleStatusToggle}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isApproved
                    ? 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700'
                    : 'bg-green-50 hover:bg-green-100 border border-green-200 text-green-700'
                }`}
              >
                {updateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isApproved ? (
                  <UserX className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                {isApproved ? 'Disapprove' : 'Approve'}
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Details */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-2 space-y-5">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0b51c1]" />
              Profile details
            </h3>

            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['fullName', 'Full name', 'text'],
                  ['email', 'Email', 'email'],
                  ['mobileNumber', 'Mobile number', 'text'],
                  ['companyName', 'Company', 'text'],
                  ['baseArea', 'Base area', 'text'],
                  ['vehicleType', 'Vehicle type', 'text'],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={form[key] || ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Short bio
                  </label>
                  <textarea
                    rows={4}
                    value={form.shortBio || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, shortBio: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: 'Mobile', value: driver.mobileNumber, icon: Phone },
                  { label: 'Company', value: driver.companyName || 'Independent', icon: Briefcase },
                  { label: 'Base area', value: driver.baseArea || '—', icon: MapPin },
                  { label: 'Vehicle', value: driver.vehicleType || '—', icon: Truck },
                  {
                    label: 'Registered',
                    value: driver.createdAt
                      ? new Date(driver.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })
                      : '—',
                    icon: Calendar,
                  },
                  {
                    label: 'Last location update',
                    value: driver.locationLastActive
                      ? new Date(driver.locationLastActive).toLocaleString()
                      : 'Never',
                    icon: MapPin,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mt-1">
                        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{item.value || '—'}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Biography</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-2 bg-slate-50 border border-slate-100 rounded-lg p-3">
                    {driver.shortBio || 'No biography provided.'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Services */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0b51c1]" />
              Services
            </h3>
            {editing ? (
              <div className="space-y-2">
                {SERVICES_LIST.map((service) => {
                  const checked = (form.servicesOffered || []).includes(service);
                  return (
                    <label
                      key={service}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold ${
                        checked
                          ? 'border-[#0b51c1]/30 bg-blue-50 text-[#0b51c1]'
                          : 'border-slate-100 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(service)}
                        className="accent-[#0b51c1]"
                      />
                      {service}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {(servicesList.length ? servicesList : ['No services listed']).map((service) => (
                  <div
                    key={service}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold text-slate-700">{service}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Offline location */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#0b51c1]" />
              Offline location pin
            </h3>
            <button
              type="button"
              disabled={locLoading}
              onClick={handleSaveOfflineLocation}
              className="px-3.5 py-2 bg-[#0b51c1] hover:bg-[#083a8c] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {locLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save offline pin
            </button>
          </div>
          <p className="text-xs text-slate-500">
            When this driver is offline, the public map uses this pin. If unset, their last GPS position is used.
            Coordinates are required before you can set them live from admin.
          </p>
          {(hasValidCoords(driver.latitude, driver.longitude) ||
            hasValidCoords(driver.offlineLatitude, driver.offlineLongitude)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="font-bold uppercase tracking-wider text-slate-400 mb-1">Last GPS</p>
                <p className="font-semibold text-slate-700">
                  {hasValidCoords(driver.latitude, driver.longitude)
                    ? `${driver.latitude}, ${driver.longitude}`
                    : 'Not available'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="font-bold uppercase tracking-wider text-slate-400 mb-1">Saved offline pin</p>
                <p className="font-semibold text-slate-700">
                  {hasValidCoords(driver.offlineLatitude, driver.offlineLongitude)
                    ? `${driver.offlineLatitude}, ${driver.offlineLongitude}`
                    : 'Not set (will fall back to last GPS)'}
                </p>
              </div>
            </div>
          )}
          <LocationPicker
            latitude={offlineCoords.latitude}
            longitude={offlineCoords.longitude}
            onChange={({ latitude, longitude }) => setOfflineCoords({ latitude, longitude })}
          />
        </section>

        {/* Media */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-[#0b51c1]" />
            Media
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                label: 'Profile image',
                url: profileUrl,
                file: profileFile,
                setFile: setProfileFile,
                empty: 'No profile image',
              },
              {
                label: 'Van image',
                url: vanUrl,
                file: vanFile,
                setFile: setVanFile,
                empty: 'No van image',
              },
            ].map((media) => (
              <div key={media.label} className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{media.label}</p>
                <div className="aspect-video w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                  {media.file ? (
                    <img
                      src={typeof window !== 'undefined' ? URL.createObjectURL(media.file) : ''}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : media.url ? (
                    <img src={media.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-xs font-semibold text-slate-400">{media.empty}</p>
                  )}
                </div>
                {editing && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => media.setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-xs file:font-bold file:text-slate-700"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
