// sections/MapEngine/MapEngine.jsx
'use client';
import { useEffect, useRef, useState } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { getSocket } from '@/lib/socket';
import { fetchLiveDrivers, logoutDriver, getCorrectImageUrl } from '@/lib/api';
import { showNotification } from '@/components/ui/ToastManager';

import MapSkeleton from '@/components/ui/MapSkeleton';
import LiveDriverMarker from '@/components/ui/LiveDriverMarker';
import OfflineDriverMarker from '@/components/ui/OfflineDriverMarker';
import UserLocationMarker from '@/components/ui/UserLocationMarker';
import DriverPopupCard from '@/components/ui/DriverPopupCard';
import DriverProfileDetailsModal from '@/components/ui/DriverProfileDetailsModal';
import LoginModal from '@/sections/LoginModal/LoginModal';
import SignupModal from '@/sections/SignupModal/SignupModal';
import ProfileModal from '@/sections/ProfileModal/ProfileModal';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_USERNAME = process.env.NEXT_PUBLIC_MAPBOX_USERNAME || 'mapbox';
const MAPBOX_STYLE_ID = process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID || 'streets-v12';
const MAP_STYLE = `mapbox://styles/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}`;

function isLive(driver) {
  return driver.isLive === true || driver.isLive === 1 || driver.isLive === 'true';
}

export default function MapEngine({ isDriverMode, initialToken, initialDriver }) {
  const [jwtToken, setJwtToken] = useState(initialToken || null);
  const [loggedInDriver, setLoggedInDriver] = useState(initialDriver || null);
  const [isDriverLive, setIsDriverLive] = useState(false);

  const [isMapReady, setIsMapReady] = useState(false);
  const [viewState, setViewState] = useState({ longitude: -4.2518, latitude: 55.8642, zoom: 11 }); // Glasgow default for replica

  const [drivers, setDrivers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDriverAddress, setSelectedDriverAddress] = useState(null);

  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false); // Mobile menu
  const [viewingDriverProfile, setViewingDriverProfile] = useState(null); // Public profile view

  const gpsWatchRef = useRef(null);
  const socketRef = useRef(null);
  const animFramesRef = useRef({});

  useEffect(() => {
    loadSession();
    fetchDrivers();
    initSocket();
    if (!isDriverMode) autoDetectLocation();
    return () => { stopGPS(); socketRef.current?.disconnect(); };
  }, []);

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
        if (wasLive) startGPS(driver, token);
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
      setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, isLive: live } : d)));
    });

    socket.on('driver_logged_out', ({ driverId }) => {
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
      setSelectedDriver((prev) => (prev?.id === driverId ? null : prev));
    });
  }

  function animateDriverMarker(driverId, newLat, newLng, live) {
    if (animFramesRef.current[driverId]) cancelAnimationFrame(animFramesRef.current[driverId]);

    setDrivers((prev) => {
      const idx = prev.findIndex((d) => d.id === driverId);
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
          p.map((d) => d.id === driverId ? { ...d, latitude: curLat, longitude: curLng, isLive: live } : d)
        );

        if (t < 1) animFramesRef.current[driverId] = requestAnimationFrame(step);
        else delete animFramesRef.current[driverId];
      }

      animFramesRef.current[driverId] = requestAnimationFrame(step);
      return prev;
    });
  }

  async function handleToggleLive(goLive) {
    if (goLive) {
      if (!navigator.geolocation) { showNotification('Geolocation is not supported.', true); return; }
      const socket = getSocket();
      socketRef.current = socket;
      if (loggedInDriver?.id) socket.emit('go_live', { driverId: loggedInDriver.id });
      setIsDriverLive(true);
      localStorage.setItem('is_driver_live', 'true');
      showNotification('You are now LIVE on the map!');
      startGPS(loggedInDriver, jwtToken);
    } else {
      stopGPS();
      if (socketRef.current?.connected && loggedInDriver?.id) socketRef.current.emit('go_offline', { driverId: loggedInDriver.id });
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
        if (socketRef.current?.connected && driver?.id) {
          socketRef.current.emit('update_location', { driverId: driver.id, latitude: lat, longitude: lng });
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
    showNotification('Login successful! Going live...');
    handleToggleLive(true);
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

  const ownDriverMarkerLat = parseFloat(localStorage?.getItem?.('last_driver_lat'));
  const ownDriverMarkerLng = parseFloat(localStorage?.getItem?.('last_driver_lng'));
  const hasOwnLocation = jwtToken && loggedInDriver && !isNaN(ownDriverMarkerLat) && !isNaN(ownDriverMarkerLng);
  const profileUrl = loggedInDriver?.profileImageUrl ? getCorrectImageUrl(loggedInDriver.profileImageUrl) : null;
  const liveCount = drivers.filter(d => isLive(d)).length;
  const offlineCount = drivers.length - liveCount;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans">
      
      {/* ── HEADER (Solid Blue exact match) ── */}
      <header className="flex-shrink-0 w-full flex flex-col" style={{ backgroundColor: '#1052c9', minHeight: '180px', padding: '24px 32px 32px 32px' }}>
        {/* Top Nav Line */}
        <div className="flex justify-between items-start w-full">
          {/* Left Logo */}
          <a href="/" className="inline-block">
            <img 
              src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69d5648b03176e73b702b52f_callvan1.png" 
              alt="Call-A-Van.live" 
              style={{ height: '36px' }}
              className="object-contain cursor-pointer hover:opacity-90 block"
            />
          </a>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            {jwtToken ? (
              <button onClick={() => setShowProfile(true)} className="w-10 h-10 rounded-full border border-white/50 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all overflow-hidden">
                {profileUrl ? <img src={profileUrl} alt="profile" className="w-full h-full object-cover" /> : "👤"}
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="border border-white/40 text-white hover:bg-white/10 transition-all" style={{ padding: '6px 20px', borderRadius: '4px', fontSize: '15px' }}>
                Driver Login
              </button>
            )}
            <button onClick={() => setShowHamburger(true)} className="text-white hover:opacity-80 transition-opacity">
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
      <main className="flex-1 relative bg-[#F0EEE9]">
        {!isMapReady && <MapSkeleton />}
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onLoad={() => setIsMapReady(true)}
          onClick={() => setSelectedDriver(null)}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
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
                    <LiveDriverMarker />
                  ) : (
                    <OfflineDriverMarker onClick={() => handleSelectDriver(driver)} />
                  )}
                  {/* Popup */}
                  {selectedDriver?.id === driver.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                      <div className="bg-white rounded-lg shadow-lg p-3 w-64 border border-gray-100 text-sm">
                        <p className="font-bold text-gray-900">{driver.fullName?.split('@')[0] || 'Driver'}</p>
                        <p className="text-xs text-gray-500 mb-1">{driver.vehicleType || 'Van'}</p>
                        <p className="text-xs text-gray-700 mb-2 truncate">📍 {selectedDriverAddress || 'Loading...'}</p>
                        <div className="flex items-center justify-between">
                          <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"/> {isLive(driver) ? 'Live' : 'Offline'}
                          </span>
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); makePhoneCall(driver.mobileNumber); }} className="bg-[#22c55e] hover:bg-[#16a34a] text-white px-2 py-1.5 rounded text-xs font-bold">Call Anyway</button>
                            <button onClick={(e) => { e.stopPropagation(); setViewingDriverProfile(driver); }} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-bold">View More</button>
                          </div>
                        </div>
                      </div>
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white mx-auto"></div>
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}

          {/* Own Live Marker */}
          {jwtToken && isDriverLive && hasOwnLocation && (
            <Marker latitude={ownDriverMarkerLat} longitude={ownDriverMarkerLng} anchor="center">
              <LiveDriverMarker />
            </Marker>
          )}

          {/* User Location */}
          {!jwtToken && userLocation && (
            <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center">
              <UserLocationMarker />
            </Marker>
          )}
        </Map>

        {/* ── MAP OVERLAYS ── */}
        {/* Top Right Locate Me */}
        <div className="absolute top-4 right-4 z-10">
          <button onClick={enableUserLocation} className="bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all border border-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
        </div>

        {/* Bottom Left Status Box */}
        <div className="absolute bottom-6 left-6 z-10 bg-white rounded-xl p-4 shadow-lg border border-gray-100 w-36">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Status</p>
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-3 h-3 bg-[#22c55e] rounded-full"></div>
            <p className="text-xs font-medium text-gray-800">{liveCount} Available</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <p className="text-xs font-medium text-gray-800">{offlineCount} Offline</p>
          </div>
        </div>

        {/* Bottom Right Live Count */}
        <div className="absolute bottom-6 right-6 z-10">
          <div className="bg-white rounded-full py-2.5 px-5 shadow-lg border border-gray-100 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-[#22c55e] rounded-full border border-green-600/20"></div>
            <span className="text-xs font-bold text-gray-800 tracking-wide">{liveCount} Drivers Online Near You</span>
          </div>
        </div>
      </main>

      {/* ── FOOTER BAR ── */}
      <footer className="flex-shrink-0 flex items-center justify-center gap-6 z-20" style={{ backgroundColor: '#1052c9', minHeight: '90px' }}>
        {!jwtToken ? (
          <>
            <button onClick={() => setShowSignup(true)} className="text-white font-bold transition-colors shadow-sm" style={{ backgroundColor: '#144cb8', padding: '12px 28px', borderRadius: '6px', fontSize: '15px' }}>
              Become a Driver
            </button>
            <button onClick={() => setShowLogin(true)} className="text-white font-bold transition-colors shadow-sm" style={{ backgroundColor: '#1bb54f', padding: '12px 32px', borderRadius: '6px', fontSize: '15px' }}>
              Go Live
            </button>
          </>
        ) : (
          <button onClick={() => handleToggleLive(!isDriverLive)} className={`text-white font-bold transition-all shadow-md ${isDriverLive ? 'bg-red-600 hover:bg-red-700' : ''}`} style={{ backgroundColor: isDriverLive ? undefined : '#1bb54f', padding: '12px 40px', borderRadius: '6px', fontSize: '15px' }}>
            {isDriverLive ? 'Stop Broadcasting' : 'Go Live Now'}
          </button>
        )}
      </footer>

      {/* ── MODALS ── */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSignUpPressed={() => { setShowLogin(false); setShowSignup(true); }}
          onPendingApproval={(email) => { setShowLogin(false); showNotification(`Account pending approval.`, false); }}
        />
      )}
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      {showProfile && loggedInDriver && (
        <ProfileModal driver={loggedInDriver} token={jwtToken} onClose={() => setShowProfile(false)} onLogout={handleLogout} onProfileUpdated={setLoggedInDriver} />
      )}
      {viewingDriverProfile && (
        <DriverProfileDetailsModal driver={viewingDriverProfile} onClose={() => setViewingDriverProfile(null)} />
      )}

      {/* HAMBURGER MENU MODAL */}
      {showHamburger && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex justify-end" onClick={() => setShowHamburger(false)}>
          <div className="bg-white w-72 h-full p-6 shadow-2xl transform transition-transform animate-slide-in-right" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="font-bold text-xl text-[#003366]">Menu</h2>
              <button onClick={() => setShowHamburger(false)} className="text-gray-400 hover:text-black text-xl">✕</button>
            </div>
            <div className="space-y-4">
              {['FAQ', 'Driver FAQ', 'Terms of Service', 'Driver Terms', 'Privacy Policy', 'Contact'].map(link => (
                <a key={link} href="#" className="block text-gray-700 font-medium hover:text-[#003366] py-2 border-b border-gray-50 text-sm">{link}</a>
              ))}
            </div>
            {!jwtToken && (
              <button onClick={() => { setShowHamburger(false); setShowLogin(true); }} className="mt-8 bg-[#0a8449] hover:bg-[#086c3b] text-white py-3 px-6 rounded-lg w-full font-bold text-sm">
                Driver Login
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
