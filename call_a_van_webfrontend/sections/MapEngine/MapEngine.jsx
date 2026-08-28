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
import PageLoader from '@/components/ui/PageLoader';
import {
  CUSTOMER_MAP_HEADER,
  DRIVER_MAP_HEADER_LIVE,
  DRIVER_MAP_HEADER_OFFLINE,
  DRIVER_MAP_HEADER_NO_LOCATION,
  LOCATION_PERMISSION_BANNER,
} from '@/constants/mapCopy';

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

  const [viewState, setViewState] = useState({ longitude: -4.2518, latitude: 55.8642, zoom: 11 }); // Glasgow default for replica

  const [drivers, setDrivers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('unknown'); // unknown | granted | denied | prompt
  const [driverLocationBannerDismissed, setDriverLocationBannerDismissed] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('Loading...');
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
  const mapRef = useRef(null);
  const prevLocationStatusRef = useRef('unknown');

  useEffect(() => {
    loadSession();
    fetchDrivers();
    initSocket();
    checkLocationPermission();
    if (!isDriverMode) autoDetectLocation();

    return () => {
      stopGPS();
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    const prev = prevLocationStatusRef.current;
    prevLocationStatusRef.current = locationStatus;

    if (locationStatus === 'denied' && prev !== 'denied') {
      setUserLocation(null);
      if (jwtToken && loggedInDriver) {
        setDriverLocation(null);
        localStorage.removeItem('last_driver_lat');
        localStorage.removeItem('last_driver_lng');
        setDriverLocationBannerDismissed(false);
        forceDriverOffline(loggedInDriver);
      }
    }
  }, [locationStatus, jwtToken, loggedInDriver]);

  function checkLocationPermission() {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setLocationStatus(result.state);
      result.onchange = () => setLocationStatus(result.state);
    }).catch(() => {});
  }

  function flyToLocation(lat, lng, zoom = 14) {
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (map?.flyTo) {
      map.flyTo({ center: [lng, lat], zoom, duration: 700, essential: true });
    }
    setViewState((v) => ({ ...v, longitude: lng, latitude: lat, zoom }));
  }

  function forceDriverOffline(driver) {
    stopGPS();
    setIsDriverLive(false);
    localStorage.setItem('is_driver_live', 'false');
    if (socketRef.current && driver?.id) {
      socketRef.current.emit('go_offline', { driverId: driver.id });
    }
  }

  function requestDriverLocation(driver = loggedInDriver) {
    if (!navigator.geolocation) {
      showNotification('Geolocation is not supported.', true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateDriverPosition(pos.coords.latitude, pos.coords.longitude, driver, true);
      },
      (err) => {
        setLocationStatus(err.code === 1 ? 'denied' : 'prompt');
        setDriverLocation(null);
        setDriverLocationBannerDismissed(false);
        forceDriverOffline(driver);
        showNotification('Please allow location to be visible on the map.', true);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function updateDriverPosition(lat, lng, driver, shouldFly = false) {
    if (isNaN(lat) || isNaN(lng)) return;
    setLocationStatus('granted');
    setDriverLocation({ lat, lng });
    if (shouldFly) {
      flyToLocation(lat, lng, 14.5);
    }
    const socket = socketRef.current || getSocket();
    if (driver?.id) {
      socket.emit('update_location', { driverId: driver.id, latitude: lat, longitude: lng });
    }
    localStorage.setItem('last_driver_lat', lat);
    localStorage.setItem('last_driver_lng', lng);
  }

  function handleDriverLocationLost(driver) {
    setDriverLocation(null);
    localStorage.removeItem('last_driver_lat');
    localStorage.removeItem('last_driver_lng');
    setDriverLocationBannerDismissed(false);
    forceDriverOffline(driver);
  }

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
        const savedLat = parseFloat(localStorage.getItem('last_driver_lat'));
        const savedLng = parseFloat(localStorage.getItem('last_driver_lng'));
        if (!isNaN(savedLat) && !isNaN(savedLng)) {
          setDriverLocation({ lat: savedLat, lng: savedLng });
        }
        const wasLive = localStorage.getItem('is_driver_live') === 'true';
        const hasSavedLocation = !isNaN(savedLat) && !isNaN(savedLng);
        setIsDriverLive(wasLive && hasSavedLocation);
        if (wasLive && hasSavedLocation) {
          const socket = getSocket();
          socketRef.current = socket;
          if (!socket.connected) socket.connect();
          socket.emit('go_live', { driverId: driver.id });
          startGPS(driver, token);
        } else if (wasLive && !hasSavedLocation) {
          localStorage.setItem('is_driver_live', 'false');
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
      setGlobalLoading(true);
      setGlobalLoadingMessage(driverOverride ? 'Logging in...' : 'Going live...');
      try {
        const socket = getSocket();
        socketRef.current = socket;
        if (!socket.connected) socket.connect();

        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              if (currentDriver?.id) {
                socket.emit('go_live', { driverId: currentDriver.id });
                updateDriverPosition(lat, lng, currentDriver, true);
              }
              setIsDriverLive(true);
              localStorage.setItem('is_driver_live', 'true');
              showNotification('You are now LIVE on the map!');
              startGPS(currentDriver, jwtToken);
              resolve();
            },
            (err) => {
              setLocationStatus(err.code === 1 ? 'denied' : 'prompt');
              forceDriverOffline(currentDriver);
              showNotification('Please allow location to go live.', true);
              reject(err);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
          );
        });
      } catch (e) {
        // stay offline
      } finally {
        setGlobalLoading(false);
      }
    } else {
      setGlobalLoading(true);
      setGlobalLoadingMessage('Going offline...');
      try {
        stopGPS();
        if (socketRef.current && currentDriver?.id) {
          socketRef.current.emit('go_offline', { driverId: currentDriver.id });
        }
        setIsDriverLive(false);
        localStorage.setItem('is_driver_live', 'false');
        showNotification('You went Offline.');
      } finally {
        setGlobalLoading(false);
      }
    }
  }

  function startGPS(driver, token) {
    stopGPS();

    navigator.geolocation.getCurrentPosition(
      (pos) => updateDriverPosition(pos.coords.latitude, pos.coords.longitude, driver, true),
      (err) => {
        setLocationStatus(err.code === 1 ? 'denied' : 'prompt');
        handleDriverLocationLost(driver);
        showNotification('GPS error: ' + err.message, true);
      },
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 5000 }
    );

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => updateDriverPosition(pos.coords.latitude, pos.coords.longitude, driver, false),
      (err) => {
        setLocationStatus(err.code === 1 ? 'denied' : 'prompt');
        handleDriverLocationLost(driver);
        showNotification('GPS error: ' + err.message, true);
      },
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
        setLocationStatus('granted');
        setUserLocation(loc);
        setViewState((v) => ({ ...v, latitude: loc.lat, longitude: loc.lng, zoom: 11 }));
      },
      (err) => setLocationStatus(err.code === 1 ? 'denied' : 'prompt'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function enableUserLocation() {
    if (!navigator.geolocation) { showNotification('Geolocation not supported.', true); return; }

    if (userLocation && locationStatus === 'granted') {
      flyToLocation(userLocation.lat, userLocation.lng, 14);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocationStatus('granted');
        setUserLocation(loc);
        flyToLocation(loc.lat, loc.lng, 14);
      },
      (err) => {
        setLocationStatus(err.code === 1 ? 'denied' : 'prompt');
        setUserLocation(null);
        showNotification(err.code === 1 ? 'Location permission denied.' : 'Could not get your location.', true);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
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
    setGlobalLoading(true);
    setGlobalLoadingMessage('Logging in...');
    setJwtToken(token);
    setLoggedInDriver(driver);
    setDriverLocationBannerDismissed(false);
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('logged_in_driver', JSON.stringify(driver));
    handleToggleLive(true, driver)
      .then(() => showNotification('Login successful!'))
      .catch(() => showNotification('Login successful! Allow location to go live.', false));
  }

  async function handleLogout() {
    setGlobalLoading(true);
    setGlobalLoadingMessage('Logging out...');
    try {
      stopGPS();
      if (socketRef.current && loggedInDriver?.id) {
        socketRef.current.emit('go_offline', { driverId: loggedInDriver.id });
      }
      setIsDriverLive(false);
      localStorage.setItem('is_driver_live', 'false');
      if (jwtToken) try { await logoutDriver(jwtToken); } catch (e) {}
      setJwtToken(null);
      setLoggedInDriver(null);
      setDriverLocation(null);
      setDriverLocationBannerDismissed(false);
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('logged_in_driver');
      showNotification('Logged out successfully.');
    } finally {
      setGlobalLoading(false);
    }
  }

  function makePhoneCall(number) {
    if (!number || number === 'N/A') { showNotification('No phone number available.', true); return; }
    navigator.clipboard.writeText(number).catch(() => {});
    window.open(`tel:${number}`, '_self');
    showNotification('Opening dialer & copied number to clipboard.');
  }

  const hasOwnLocation = jwtToken && loggedInDriver && driverLocation;
  const ownDriverMarkerLat = driverLocation?.lat;
  const ownDriverMarkerLng = driverLocation?.lng;
  const profileUrl = loggedInDriver?.profileImageUrl ? getCorrectImageUrl(loggedInDriver.profileImageUrl) : null;
  const liveCount = drivers.filter(d => isLive(d)).length;
  const offlineCount = drivers.length - liveCount;
  const isLoggedInDriver = !!jwtToken;
  const effectiveDriverLive = isDriverLive && !!hasOwnLocation;
  const showDriverLocationBanner = isLoggedInDriver && !hasOwnLocation && !driverLocationBannerDismissed;
  const mapHeaderCopy = isLoggedInDriver
    ? (!hasOwnLocation || locationStatus === 'denied'
        ? DRIVER_MAP_HEADER_NO_LOCATION
        : (effectiveDriverLive ? DRIVER_MAP_HEADER_LIVE : DRIVER_MAP_HEADER_OFFLINE))
    : CUSTOMER_MAP_HEADER;

  return (
    <div className={`flex flex-col w-full overflow-x-hidden font-sans ${(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact) ? 'min-h-screen' : 'h-[100dvh] sm:h-screen overflow-hidden'}`}>
      
      {/* ── HEADER (Solid Blue exact match) ── */}
      <header className="flex-shrink-0 w-full flex flex-col bg-[#0b51c1] px-4 py-4 min-h-[148px] sm:px-8 sm:py-5 sm:min-h-[168px] md:px-10 md:min-h-[180px]">
        {/* Top Nav Line */}
        <div className="flex justify-between items-center w-full gap-3">
          {/* Left Logo */}
          <a href="/" className="inline-block cursor-pointer shrink-0">
            <img 
              src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69d5648b03176e73b702b52f_callvan1.png" 
              alt="Call-A-Van.live" 
              className="h-8 sm:h-9 md:h-10 object-contain hover:opacity-90 transition-opacity block"
            />
          </a>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6 shrink-0">
            {jwtToken ? (
              <button onClick={() => setShowProfile(true)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/50 bg-white/10 flex items-center justify-center text-white hover:bg-white/30 transition-all cursor-pointer shadow-sm">
                {profileUrl ? <img src={profileUrl} alt="profile" className="w-full h-full object-cover rounded-full" /> : "👤"}
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="border border-white/40 text-white hover:bg-white/20 transition-all cursor-pointer shadow-sm font-medium bg-white/10 px-3 py-1.5 rounded-md text-xs sm:px-6 sm:py-2 sm:rounded-[6px] sm:text-[15px] whitespace-nowrap">
                Driver Login
              </button>
            )}
            <button onClick={() => setShowHamburger(true)} className="text-white hover:opacity-75 transition-opacity cursor-pointer p-0.5">
              <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
          </div>
        </div>

        {/* Center Title Section */}
        <div className="flex-1 flex flex-col items-center justify-end text-center mt-3 sm:mt-4 px-2 sm:px-4">
          <h1 className="text-white font-bold tracking-tight text-[22px] leading-tight sm:text-[28px] md:text-[34px] md:leading-[1.2] max-w-[20rem] sm:max-w-xl md:max-w-2xl">{mapHeaderCopy.title}</h1>
          <p className="text-white font-normal mt-1.5 sm:mt-2 text-[13px] sm:text-sm md:text-[15px] max-w-[18rem] sm:max-w-md md:max-w-xl leading-snug">{mapHeaderCopy.subtitle}</p>
        </div>
      </header>

      {/* ── MAP AREA ── */}
      <main className="flex-1 relative bg-[#F0EEE9] flex flex-col min-h-0">
        <div className="absolute inset-0 z-0">
          <Map
            ref={mapRef}
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
                    <LiveDriverMarker isOrange={!!jwtToken} zoom={viewState.zoom} onClick={(e) => { e.stopPropagation(); handleSelectDriver(driver); }} />
                  ) : (
                    <OfflineDriverMarker zoom={viewState.zoom} onClick={(e) => { e.stopPropagation(); handleSelectDriver(driver); }} />
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
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[20px] z-50 w-[min(260px,calc(100vw-2rem))]">
                        <div className="bg-white rounded-[12px] shadow-[0_3px_10px_rgba(0,0,0,0.26)] w-full overflow-hidden">
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
                {effectiveDriverLive ? (
                  <LiveDriverMarker isOrange={false} zoom={viewState.zoom} />
                ) : (
                  <div className="pointer-events-none">
                    <OfflineDriverMarker zoom={viewState.zoom} />
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
            {/* Top Right Locate — customers only (icon); fly if granted, else browser prompt */}
            {!isLoggedInDriver && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
              <button
                onClick={enableUserLocation}
                className={`bg-white shadow-md rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-gray-50 transition-all border cursor-pointer ${
                  userLocation ? 'text-gray-700 border-gray-100' : 'text-[#0b51c1] border-gray-200 ring-2 ring-[#0b51c1]/15'
                }`}
                aria-label={userLocation ? 'Go to my location' : 'Allow location'}
                title={userLocation ? 'Go to my location' : 'Allow location'}
              >
                <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              </button>
            </div>
            )}

            {!isLoggedInDriver && (
              <>
                {/* Bottom Left Status Box */}
                <div className="absolute bottom-3 left-3 sm:bottom-10 sm:left-8 z-10 bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-100 min-w-[132px] sm:min-w-[160px] p-3 sm:p-5">
                  <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Status</p>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-2.5">
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#22c55e] rounded-full shadow-sm shrink-0"></div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 whitespace-nowrap">{liveCount} Available</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-gray-400 rounded-full shadow-sm shrink-0"></div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 whitespace-nowrap">{offlineCount} Offline</p>
                  </div>
                </div>

                {/* Bottom Right Live Count */}
                <div className="absolute bottom-3 right-3 sm:bottom-10 sm:right-8 z-10 max-w-[calc(100%-9.5rem)] sm:max-w-none">
                  <div className="bg-white rounded-full py-2 px-3 sm:py-3.5 sm:px-6 shadow-lg border border-gray-100 flex items-center gap-2 sm:gap-3">
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#22c55e] rounded-full border border-green-600/20 shadow-sm shrink-0"></div>
                    <span className="text-[11px] sm:text-sm font-bold text-gray-800 tracking-wide leading-tight">
                      <span className="sm:hidden">{liveCount} Online Near You</span>
                      <span className="hidden sm:inline">{liveCount} Drivers Online Near You</span>
                    </span>
                  </div>
                </div>
              </>
            )}
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

      {/* ── DRIVER LOCATION BANNER (above footer, drivers only) ── */}
      {showDriverLocationBanner && !(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact) && (
        <div className="flex-shrink-0 w-full bg-white border-t border-amber-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <p className="flex-1 min-w-0 text-sm sm:text-[15px] font-semibold text-gray-800 leading-snug">{LOCATION_PERMISSION_BANNER.message}</p>
            <button
              onClick={() => requestDriverLocation()}
              className="shrink-0 bg-[#0b51c1] hover:bg-[#083a8c] text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
            >
              {LOCATION_PERMISSION_BANNER.allowButton}
            </button>
            <button
              onClick={() => setDriverLocationBannerDismissed(true)}
              className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── FOOTER BAR ── */}
      {!(isFAQ || isDriverFAQ || isTerms || isDriverTerms || isPrivacyPolicy || isContact) && (
      <footer className="flex-shrink-0 w-full flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2.5 sm:gap-6 bg-[#0b51c1] px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-2.5">
        {!jwtToken ? (
          <>
            <button onClick={() => setShowSignup(true)} className="w-full sm:w-auto text-white font-bold transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 bg-[#144cb8] py-2.5 px-6 rounded-lg text-sm sm:py-3 sm:px-9 sm:rounded-[8px] sm:text-base">
              Become a Driver
            </button>
            <button onClick={() => setShowLogin(true)} className="w-full sm:w-auto text-white font-bold transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 bg-[#1bb54f] py-2.5 px-6 rounded-lg text-sm sm:py-3 sm:px-11 sm:rounded-[8px] sm:text-base">
              Go Live
            </button>
          </>
        ) : (
          <button
            onClick={() => handleToggleLive(!effectiveDriverLive)}
            className={`w-full sm:w-auto text-white font-bold transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 py-2.5 px-6 rounded-lg text-sm sm:py-3 sm:px-12 sm:rounded-[8px] sm:text-base ${
              effectiveDriverLive ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1bb54f] hover:bg-[#16a34a]'
            }`}
          >
            {effectiveDriverLive ? 'Go Offline' : 'Go Live Now'}
          </button>
        )}
      </footer>
      )}

      {globalLoading && <PageLoader message={globalLoadingMessage} />}

      {/* ── MODALS ── */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSignUpPressed={() => { setShowLogin(false); setShowSignup(true); }}
          onPendingApproval={(email) => { setShowLogin(false); showNotification(`Account pending approval.`, false); }}
          onForgotPassword={() => setShowForgotPassword(true)}
          onLoadingChange={(loading, message) => {
            if (loading) {
              setGlobalLoading(true);
              setGlobalLoadingMessage(message || 'Signing in...');
            }
          }}
        />
      )}
      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onLoadingChange={(loading) => {
            setGlobalLoading(loading);
            setGlobalLoadingMessage(loading ? 'Creating your account...' : 'Loading...');
          }}
        />
      )}
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
