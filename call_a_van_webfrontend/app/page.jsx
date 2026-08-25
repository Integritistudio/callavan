// app/page.jsx
// Root page — directly renders the MapEngine (callavan.live replica)

'use client';
import dynamic from 'next/dynamic';
import ToastManager from '@/components/ui/ToastManager';

// Dynamic import prevents SSR issues with mapbox-gl (browser-only)
const MapEngine = dynamic(() => import('@/sections/MapEngine/MapEngine'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F0EEE9]">
      <div className="w-12 h-12 border-4 border-[#0a2540] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">Loading Map...</p>
    </div>
  ),
});

export default function RootPage() {
  return (
    <>
      <ToastManager />
      {/* We always render MapEngine since it handles both customer and driver state internally based on login */}
      <MapEngine isDriverMode={false} />
    </>
  );
}
