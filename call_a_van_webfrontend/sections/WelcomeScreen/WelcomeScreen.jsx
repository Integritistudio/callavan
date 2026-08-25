// sections/WelcomeScreen/WelcomeScreen.jsx
// Mirrors Flutter's WelcomeScreen widget exactly — same colors, same cards, same logic

'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Mirrors Flutter's _checkSavedSession — if driver is logged in, redirect to driver map
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    const driverJson = localStorage.getItem('logged_in_driver');
    if (token && driverJson) {
      // Slight delay for splash feel — matches Flutter's 1-second delay
      setTimeout(() => router.replace('/driver'), 1000);
    } else {
      setChecking(false);
    }
  }, [router]);

  // ── Splash loader — mirrors Flutter's checking session state ──
  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#1565C0' }}>
        <img src="/logo.png" alt="Call-A-Van" className="h-24 object-contain px-10 mb-6"
          onError={(e) => { e.target.style.display = 'none'; }} />
        <div className="w-6 h-6 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-9"
      style={{ backgroundColor: '#1565C0' }}
    >
      {/* ── Logo ── */}
      <div className="flex-1 flex flex-col items-center justify-end mb-8 w-full">
        <div className="w-full max-w-xs px-10">
          <img src="/logo.png" alt="Call-A-Van" className="w-full h-24 object-contain"
            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<h1 class="text-white font-black text-3xl text-center">Call-A-Van</h1>'; }} />
        </div>
        <h1 className="text-white font-bold text-2xl mt-4 text-center" style={{ letterSpacing: '-0.5px' }}>
          Welcome to Call-A-Van
        </h1>
        <p className="text-white/70 text-sm mt-2 font-medium text-center">
          Select your role below to get started
        </p>
      </div>

      {/* ── Role Cards ── */}
      <div className="flex-1 flex flex-col items-center justify-start w-full max-w-lg gap-5">
        {/* Customer Card */}
        <RoleCard
          title="Use as Customer"
          subtitle="View live drivers on the map, check details, and call instantly."
          icon="🔍"
          accentColor="#1565C0"
          onClick={() => router.push('/map')}
        />

        {/* Driver Card */}
        <RoleCard
          title="Use as Driver"
          subtitle="Go online to stream your location on the map and receive direct calls from customers."
          icon="🚐"
          accentColor="#1AB451"
          onClick={() => router.push('/driver')}
        />
      </div>

      {/* ── Footer ── */}
      <div className="flex-1 flex items-end justify-center pb-2">
        <p className="text-white/60 text-xs font-semibold">
          Call-A-Van © 2026. All rights reserved.
        </p>
      </div>
    </main>
  );
}

function RoleCard({ title, subtitle, icon, accentColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 flex items-start gap-4 text-left transition-all active:scale-95 hover:shadow-lg"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
    >
      {/* Icon circle */}
      <div
        className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl"
        style={{ backgroundColor: `${accentColor}1A` }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h2 className="font-bold text-lg text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
      </div>

      {/* Arrow */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center self-center"
        style={{ backgroundColor: '#F5F5F5' }}
      >
        <span className="text-gray-500 text-xs">›</span>
      </div>
    </button>
  );
}
