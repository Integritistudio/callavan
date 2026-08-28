// sections/MapEngine/MapEngine.jsx
'use client';
import { useEffect, useRef, useState } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { getSocket, disconnectSocket } from '@/lib/socket';
import { fetchLiveDrivers, logoutDriver, getCorrectImageUrl } from '@/lib/api';
import { showNotification } from '@/components/ui/ToastManager';

import LiveDriverMarker from '@/components/ui/LiveDriverMarker';
import OfflineDriverMarker from '@/components/ui/OfflineDriverMarker';
import UserLocationMarker from '@/components/ui/UserLocationMarker';
import DriverPopupCard from '@/components/ui/DriverPopupCard';
import DriverProfileDetailsModal from '@/components/ui/DriverProfileDetailsModal';
import LoginModal from '@/sections/LoginModal/LoginModal';
import SignupModal from '@/sections/SignupModal/SignupModal';
import ProfileModal from '@/sections/ProfileModal/ProfileModal';
import ForgotPasswordModal from '@/sections/ForgotPasswordModal/ForgotPasswordModal';
import { useRouter } from 'next/navigation';
import FAQContent from '@/components/ui/FAQContent';
import DriverFAQContent from '@/components/ui/DriverFAQContent';
import TermsContent from '@/components/ui/TermsContent';
import DriverTermsContent from '@/components/ui/DriverTermsContent';
import PrivacyPolicyContent from '@/components/ui/PrivacyPolicyContent';
import ContactContent from '@/components/ui/ContactContent';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_USERNAME = process.env.NEXT_PUBLIC_MAPBOX_USERNAME || 'mapbox';
const MAPBOX_STYLE_ID = process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID || 'cm091iigj00im01pg095j86n1';
const MAP_STYLE = `mapbox://styles/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}`;

function isLive(driver) {
  return driver.isLive === true || driver.isLive === 1 || driver.isLive === 'true';
}

export default function MapEngine({ isDriverMode, initialToken, initialDriver, isFAQ = false, isDriverFAQ = false, isTerms = false, isDriverTerms = false, isPrivacyPolicy = false, isContact = false }) {
  const router = useRouter();
  const [jwtToken, setJwtToken] = useState(initialToken || null);
  const [loggedInDriver, setLoggedInDriver] = useState(initialDriver || null);
  const [isDriverLive, setIsDriverLive] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [viewState, setViewState] = useState({ longitude: -4.2518, latitude: 55.8642, zoom: 11 }); // Glasgow default for replica

  const [drivers, setDrivers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDriverAddress, setSelectedDriverAddress] = useState(null);

  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false); // Mobile menu
  const [viewingDriverProfile, setViewingDriverProfile] = useState(null); // Public profile view

  const gpsWatchRef = useRef(null);
  const socketRef = useRef(null);
  const animFramesRef = useRef({});

  useEffect(() => {
    setIsMounted(true);
    loadSession();
    fetchDrivers();
    initSocket();
    if (!isDriverMode) autoDetectLocation();

    return () => {
      stopGPS();
      disconnectSocket();
    };
  }, []);

  const handleProfileUpdated = (updatedDriver) => {
    setLoggedInDriver(updatedDriver);
    if (typeof window !== 'undefined') {
      localStorage.setItem('logged_in_driver', JSON.stringify(updatedDriver));
    }
  };

  function loadSession() {
    if (typeof window === 'undefined') return;
    const token = initialToken || localStorage.getItem('jwt_token');
    const driverJson = localStorage.getItem('logged_in_driver');
    if (token && driverJson) {
      try {
        const driver = JSON.parse(driverJson);
        setJwtToken(token);
        setLoggedInDriver(driver);
        const wasLive = localStorage.getItem('is_driver_live') === 'true';
        if (wasLive) {
          const socket = getSocket();
          socketRef.current = socket;
          if (!socket.connected) socket.connect();
          socket.emit('go_live', { driverId: driver.id });
          startGPS(driver, token);
        }
      } catch (e) {}
    }
  }

  async function fetchDrivers() {
    try {
      const list = await fetchLiveDrivers();
      setDrivers(list);
    } catch (e) {}
  }

  function initSocket() {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('driver_location_changed', ({ driverId, latitude, longitude, isLive: live }) => {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      animateDriverMarker(driverId, lat, lng, live);
    });

    socket.on('driver_status_changed', ({ driverId, isLive: live }) => {
      setDrivers((prev) => prev.map((d) => (String(d.id) === String(driverId) ? { ...d, isLive: live } : d)));
    });

    socket.on('driver_logged_out', ({ driverId }) => {
      setDrivers((prev) => prev.filter((d) => String(d.id) !== String(driverId)));
      setSelectedDriver((prev) => (prev && String(prev.id) === String(driverId) ? null : prev));
    });
  }

  function animateDriverMarker(driverId, newLat, newLng, live) {
    if (animFramesRef.current[driverId]) cancelAnimationFrame(animFramesRef.current[driverId]);

    setDrivers((prev) => {
      const idx = prev.findIndex((d) => String(d.id) === String(driverId));
      if (idx === -1) { fetchDrivers(); return prev; }

      const oldLat = parseFloat(prev[idx].latitude) || newLat;
      const oldLng = parseFloat(prev[idx].longitude) || newLng;
      const start = performance.now();
      const duration = 1000;

      function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const curLat = oldLat + (newLat - oldLat) * easedT;
        const curLng = oldLng + (newLng - oldLng) * easedT;

        setDrivers((p) =>
          p.map((d) => String(d.id) === String(driverId) ? { ...d, latitude: curLat, longitude: curLng, isLive: live } : d)
        );

        if (t < 1) animFramesRef.current[driverId] = requestAnimationFrame(step);
        else delete animFramesRef.current[driverId];
      }

      animFramesRef.current[driverId] = requestAnimationFrame(step);
      return prev;
    });
  }

  async function handleToggleLive(goLive, driverOverride = null) {
    const currentDriver = driverOverride || loggedInDriver;
    
    if (goLive) {
      if (!navigator.geolocation) { showNotification('Geolocation is not supported.', true); return; }
      const socket = getSocket();
      socketRef.current = socket;
      if (!socket.connected) socket.connect();

      if (currentDriver?.id) {
        socket.emit('go_live', { driverId: currentDriver.id });
      }
      setIsDriverLive(true);
      localStorage.setItem('is_driver_live', 'true');
      showNotification('You are now LIVE on the map!');
      startGPS(currentDriver, jwtToken);
    } else {
      stopGPS();
      if (socketRef.current && currentDriver?.id) {
        socketRef.current.emit('go_offline', { driverId: currentDriver.id });
      }
      setIsDriverLive(false);
      localStorage.setItem('is_driver_live', 'false');
      showNotification('You went Offline.');
    }
  }

  function startGPS(driver, token) {
    stopGPS();
    setIsDriverLive(true);
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (isNaN(lat) || isNaN(lng)) return;
        setViewState((v) => ({ ...v, longitude: lng, latitude: lat, zoom: Math.max(v.zoom, 14.5) }));
        
        const socket = socketRef.current || getSocket();
        if (driver?.id) {
          socket.emit('update_location', { driverId: driver.id, latitude: lat, longitude: lng });
        }
        
        localStorage.setItem('last_driver_lat', lat);
        localStorage.setItem('last_driver_lng', lng);
      },
      (err) => showNotification('GPS error: ' + err.message, true),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  function stopGPS() {
    if (gpsWatchRef.current !== null) { navigator.geolocation.clearWatch(gpsWatchRef.current); gpsWatchRef.current = null; }
  }

  function autoDetectLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setViewState((v) => ({ ...v, latitude: loc.lat, longitude: loc.lng, zoom: 11 }));
      },
      () => {}
    );
  }

  async function enableUserLocation() {
    if (!navigator.geolocation) { showNotification('Geolocation not supported.', true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setViewState((v) => ({ ...v, latitude: loc.lat, longitude: loc.lng, zoom: 14 }));
      },
      () => showNotification('Could not get your location.', true),
      { enableHighAccuracy: true }
    );
  }

  async function fetchAddress(lat, lng) {
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
      const data = await res.json();
      return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
  }

  async function handleSelectDriver(driver) {
    setSelectedDriver(driver);
    setSelectedDriverAddress('Loading address...');
    const lat = parseFloat(driver.latitude);
    const lng = parseFloat(driver.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      const addr = await fetchAddress(lat, lng);
      setSelectedDriverAddress(addr);
    } else setSelectedDriverAddress('Location not available yet');
  }

  function handleLoginSuccess(token, driver) {
    setJwtToken(token);
    setLoggedInDriver(driver);
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('logged_in_driver', JSON.stringify(driver));
    showNotification('Login successful!');
    handleToggleLive(true, driver);
  }

  async function handleLogout() {
    await handleToggleLive(false);
    if (jwtToken) try { await logoutDriver(jwtToken); } catch (e) {}
    setJwtToken(null);
    setLoggedInDriver(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('logged_in_driver');
    localStorage.setItem('is_driver_live', 'false');
    showNotification('Logged out successfully.');
  }

  function makePhoneCall(number) {
    if (!number || number === 'N/A') { showNotification('No phone number available.', true); return; }
    navigator.clipboard.writeText(number).catch(() => {});
    window.open(`tel:${number}`, '_self');
    showNotification('Opening dialer & copied number to clipboard.');
  }

  const ownDriverMarkerLat = isMounted ? parseFloat(localStorage.getItem('last_driver_lat')) : NaN;
  const ownDriverMarkerLng = isMounted ? parseFloat(localStorage.getItem('last_driver_lng')) : NaN;
  const hasOwnLocation = jwtToken && loggedInDriver && !isNaN(ownDriverMarkerLat) && !isNaN(ownDriverMarkerLng);
  const profileUrl = loggedInDriver?.profileImageUrl ? getCorrectImageUrl(loggedInDriver.profileImageUrl) : null;
  const liveCount = drivers.filter(d => isLive(d)).length;
  const offlineCount = drivers.length - liveCount;

  return (
    <div className={`flex flex-col w-full overflow-x-hidden font-sans ${(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact) ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>
      
      {/* ── HEADER (Solid Blue exact match) ── */}
      <header className="flex-shrink-0 w-full flex flex-col" style={{ backgroundColor: '#0b51c1', minHeight: '180px', padding: '32px 40px' }}>
        {/* Top Nav Line */}
        <div className="flex justify-between items-center w-full">
          {/* Left Logo */}
          <a href="/" className="inline-block cursor-pointer">
            <img 
              src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69d5648b03176e73b702b52f_callvan1.png" 
              alt="Call-A-Van.live" 
              style={{ height: '40px' }}
              className="object-contain hover:opacity-90 transition-opacity block"
            />
          </a>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            {jwtToken ? (
              <button onClick={() => setShowProfile(true)} className="w-10 h-10 rounded-full border border-white/50 bg-white/10 flex items-center justify-center text-white hover:bg-white/30 transition-all cursor-pointer shadow-sm">
                {profileUrl ? <img src={profileUrl} alt="profile" className="w-full h-full object-cover rounded-full" /> : "👤"}
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="border border-white/40 text-white hover:bg-white/20 transition-all cursor-pointer shadow-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '8px 24px', borderRadius: '6px', fontSize: '15px' }}>
                Driver Login
              </button>
            )}
            <button onClick={() => setShowHamburger(true)} className="text-white hover:opacity-75 transition-opacity cursor-pointer">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
          </div>
        </div>

        {/* Center Title Section */}
        <div className="flex-1 flex flex-col items-center justify-end text-center mt-4">
          <h1 className="text-white font-bold tracking-tight" style={{ fontSize: '34px', lineHeight: '1.2' }}>See Who is Live Near You</h1>
          <p className="text-white font-normal mt-2" style={{ fontSize: '15px' }}>Local drivers. Real-time availability. Call directly</p>
        </div>
      </header>

      {/* ── MAP AREA ── */}
      <main className="flex-1 relative bg-[#F0EEE9] flex flex-col">
        <div className="absolute inset-0 z-0">
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={MAP_STYLE}
            {...viewState}
            onMove={(e) => setViewState(e.viewState)}
            onClick={() => setSelectedDriver(null)}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
            cursor="default"
            scrollZoom={!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact)}
            dragPan={!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact)}
            dragRotate={!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact)}
            keyboard={!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact)}
            doubleClickZoom={!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact)}
            touchZoomRotate={!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact)}
          >
          {/* Other Drivers */}
          {drivers.filter((d) => d.id !== loggedInDriver?.id).map((driver) => {
            const lat = parseFloat(driver.latitude);
            const lng = parseFloat(driver.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <Marker key={driver.id} latitude={lat} longitude={lng} anchor="center">
                <div className="relative">
                  {isLive(driver) ? (
                    <LiveDriverMarker isOrange={!!jwtToken} onClick={(e) => { e.stopPropagation(); handleSelectDriver(driver); }} />
                  ) : (
                    <OfflineDriverMarker onClick={(e) => { e.stopPropagation(); handleSelectDriver(driver); }} />
                  )}
                  {/* Popup */}
                  {selectedDriver?.id === driver.id && (() => {
                    let servicesList = [];
                    if (driver.services) {
                      try {
                        servicesList = typeof driver.services === 'string' ? JSON.parse(driver.services) : driver.services;
                      } catch(e) {}
                    }
                    if (!Array.isArray(servicesList) || servicesList.length === 0) {
                      servicesList = ['General Van Services'];
                    }
                    const isDriverLive = isLive(driver);
                    const isDriverMode = !!jwtToken; // user is logged in as driver
                    const displayName = driver.fullName?.split('@')[0] || 'Driver Profile';
                    const profileImgUrl = driver.profileImageUrl ? getCorrectImageUrl(driver.profileImageUrl) : null;
                    
                    return (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[20px] z-50">
                        <div className="bg-white rounded-[12px] shadow-[0_3px_10px_rgba(0,0,0,0.26)] w-[260px] overflow-hidden">
                          {/* Header */}
                          <div className="relative p-2.5 pb-1.5 flex items-start gap-2">
                            {/* Close Button */}
                            <button onClick={(e) => { e.stopPropagation(); setSelectedDriver(null); }} className="absolute top-2.5 right-2.5 w-5 h-5 bg-black/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/20">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-black/50"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                            
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-[#2E7D32]/10 flex items-center justify-center shrink-0 overflow-hidden">
                              {profileImgUrl ? (
                                <img src={profileImgUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#2E7D32]"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                              )}
                            </div>
                            
                            {/* Details */}
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-[13px] text-gray-800 truncate">{displayName}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${isDriverLive ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#EEEEEE] text-gray-700'}`}>
                                  {isDriverLive ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-600 font-medium truncate mt-[1px]">
                                {driver.companyName || 'Independent Driver'}
                              </div>
                            </div>
                          </div>
                          
                          {isDriverMode ? (
                            <>
                              <div className="h-[0.5px] bg-gray-200 w-full"></div>
                              <div className="px-2.5 py-2 flex items-center gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                                <span className="text-[10px] font-bold text-gray-800 truncate">Vehicle: {driver.vehicleType || 'N/A'}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-[0.5px] bg-gray-200 w-full"></div>
                              <div className="px-2.5 py-1.5 flex flex-col gap-1">
                                <button onClick={(e) => { e.stopPropagation(); makePhoneCall(driver.mobileNumber || driver.phoneNumber); }} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 p-0.5 -ml-0.5 rounded w-full text-left">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                  <span className="text-[11px] font-bold text-gray-800">{driver.mobileNumber || driver.phoneNumber || 'N/A'}</span>
                                </button>
                                <div className="flex items-start gap-1.5 p-0.5 -ml-0.5">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                  <span className="text-[10px] text-gray-800 leading-tight line-clamp-2">{selectedDriverAddress || 'Loading address...'}</span>
                                </div>
                              </div>
                              <div className="h-[0.5px] bg-gray-200 w-full"></div>
                              <div className="p-2.5 pt-1.5 pb-2.5">
                                <div className="text-[10px] font-bold text-gray-500 mb-1">Services Offered:</div>
                                <div className="flex flex-col gap-0.5 mb-2">
                                  {servicesList.slice(0, 3).map((svc, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#2E7D32] shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      <span className="text-[10px] text-gray-800 truncate">{svc}</span>
                                    </div>
                                  ))}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); makePhoneCall(driver.mobileNumber || driver.phoneNumber); }} className="w-full bg-[#2E7D32] hover:bg-[#256629] text-white rounded-md h-[34px] flex items-center justify-center gap-1.5 cursor-pointer">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                  <span className="text-[12px] font-bold">Call a Driver</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Downward Triangle */}
                        <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-white mx-auto -mt-[1px]"></div>
                      </div>
                    );
                  })()}
                </div>
              </Marker>
            );
          })}

          {/* Own Driver Marker (Live or Offline) */}
          {jwtToken && hasOwnLocation && (
            <Marker latitude={ownDriverMarkerLat} longitude={ownDriverMarkerLng} anchor="center">
              <div className="relative z-20">
                {isDriverLive ? (
                  <LiveDriverMarker isOrange={false} />
                ) : (
                  <div className="pointer-events-none">
                    <OfflineDriverMarker />
                  </div>
                )}
              </div>
            </Marker>
          )}

          {/* User Location */}
          {!jwtToken && userLocation && (
            <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center">
              <UserLocationMarker />
            </Marker>
          )}
        </Map>
        </div>

        {/* ── MAP OVERLAYS ── */}
        {!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact) && (
          <>
            {/* Top Right Locate Me */}
            <div className="absolute top-4 right-4 z-10">
              <button onClick={enableUserLocation} className="bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all border border-gray-100 cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              </button>
            </div>

            {/* Bottom Left Status Box */}
            <div className="absolute bottom-10 left-8 z-10 bg-white rounded-xl shadow-lg border border-gray-100 min-w-[160px] p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Status</p>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-3.5 h-3.5 bg-[#22c55e] rounded-full shadow-sm"></div>
                <p className="text-sm font-semibold text-gray-800">{liveCount} Available</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 bg-gray-400 rounded-full shadow-sm"></div>
                <p className="text-sm font-semibold text-gray-800">{offlineCount} Offline</p>
              </div>
            </div>

            {/* Bottom Right Live Count */}
            <div className="absolute bottom-10 right-8 z-10">
              <div className="bg-white rounded-full py-3.5 px-6 shadow-lg border border-gray-100 flex items-center gap-3">
                <div className="w-3.5 h-3.5 bg-[#22c55e] rounded-full border border-green-600/20 shadow-sm"></div>
                <span className="text-sm font-bold text-gray-800 tracking-wide">{liveCount} Drivers Online Near You</span>
              </div>
            </div>
          </>
        )}

        {(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact) && (
          <div className="relative z-10 w-full flex-1 flex flex-col h-full">
            {isFAQ && <FAQContent />}
            {isDriverFAQ && <DriverFAQContent />}
            {isTerms && <TermsContent />}
            {isDriverTerms && <DriverTermsContent />}
            {isPrivacyPolicy && <PrivacyPolicyContent />}
            {isContact && <ContactContent />}
          </div>
        )}
      </main>

      {/* ── FOOTER BAR ── */}
      {!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact) && (
      <footer className="flex-shrink-0 w-full flex justify-center gap-6" style={{ backgroundColor: '#0b51c1', padding: '16px 0' }}>
        {!jwtToken ? (
          <>
            <button onClick={() => setShowSignup(true)} className="text-white font-bold transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5" style={{ backgroundColor: '#144cb8', padding: '14px 36px', borderRadius: '8px', fontSize: '16px' }}>
              Become a Driver
            </button>
            <button onClick={() => setShowLogin(true)} className="text-white font-bold transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5" style={{ backgroundColor: '#1bb54f', padding: '14px 44px', borderRadius: '8px', fontSize: '16px' }}>
              Go Live
            </button>
          </>
        ) : (
          <button onClick={() => handleToggleLive(!isDriverLive)} className="text-white font-bold transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5" style={{ backgroundColor: '#1bb54f', padding: '14px 48px', borderRadius: '8px', fontSize: '16px' }}>
            {isDriverLive ? 'Go Offline' : 'Go Live Now'}
          </button>
        )}
      </footer>
      )}

      {/* ── MODALS ── */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSignUpPressed={() => { setShowLogin(false); setShowSignup(true); }}
          onPendingApproval={(email) => { setShowLogin(false); showNotification(`Account pending approval.`, false); }}
          onForgotPassword={() => setShowForgotPassword(true)}
        />
      )}
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      {showForgotPassword && (
        <ForgotPasswordModal 
          onClose={() => setShowForgotPassword(false)}
          onBackToLogin={() => { setShowForgotPassword(false); setShowLogin(true); }}
        />
      )}
      {showProfile && loggedInDriver && (
        <ProfileModal driver={loggedInDriver} token={jwtToken} onClose={() => setShowProfile(false)} onLogout={handleLogout} onProfileUpdated={handleProfileUpdated} />
      )}
      {viewingDriverProfile && (
        <DriverProfileDetailsModal driver={viewingDriverProfile} onClose={() => setViewingDriverProfile(null)} />
      )}

      {/* HAMBURGER MENU MODAL */}
      {showHamburger && (
        <div className="fixed inset-0 bg-transparent z-[9999] flex items-center justify-center p-4" onClick={() => setShowHamburger(false)}>
          <div className="bg-white w-full max-w-[340px] rounded-[16px] overflow-hidden shadow-2xl border border-gray-300 animate-fade-in" onClick={e => e.stopPropagation()} style={{ animation: 'modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            
            {/* Header (Blue) */}
            <div className="bg-[#0b51c1] px-4 py-3.5 flex justify-between items-center">
              <img 
                src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69d5648b03176e73b702b52f_callvan1.png" 
                alt="Call-A-Van.live" 
                style={{ height: '26px' }}
                className="object-contain"
              />
              <button onClick={() => setShowHamburger(false)} className="text-white hover:opacity-80 p-1 cursor-pointer">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 py-2">
              {['FAQ', 'Driver FAQ', 'Terms of Service', 'Driver Terms', 'Privacy Policy', 'Contact'].map((link, idx, arr) => (
                <button 
                  key={link} 
                  type="button"
                  onClick={() => {
                    setShowHamburger(false);
                    if (link === 'FAQ') {
                      router.push('/faq');
                    } else if (link === 'Driver FAQ') {
                      router.push('/driver-faq');
                    } else if (link === 'Terms of Service') {
                      router.push('/terms-conditions');
                    } else if (link === 'Driver Terms') {
                      router.push('/driver-terms');
                    } else if (link === 'Privacy Policy') {
                      router.push('/privacy-policy');
                    } else if (link === 'Contact') {
                      router.push('/contact');
                    }
                  }} 
                  className={`w-full flex items-center justify-between py-4 text-gray-800 hover:bg-gray-50 text-[15px] font-medium transition-colors cursor-pointer ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  {link}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b51c1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              ))}
            </div>

            {/* Login Button (If Not Logged In) */}
            {!jwtToken && (
              <div className="px-4 pb-5 pt-2">
                <button 
                  onClick={() => { setShowHamburger(false); setShowLogin(true); }} 
                  className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white py-3.5 rounded-[8px] font-bold text-[15px] shadow-sm transition-colors cursor-pointer"
                >
                  Driver Login
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
