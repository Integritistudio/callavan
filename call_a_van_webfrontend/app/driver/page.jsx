// app/driver/page.jsx
// Driver map page — mirrors Flutter's HomeScreen(isDriverMode: true)

'use client';
import dynamic from 'next/dynamic';
import ToastManager from '@/components/ui/ToastManager';

const MapEngine = dynamic(() => import('@/sections/MapEngine/MapEngine'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EEE9' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1AB451] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm font-medium">Loading driver mode...</p>
      </div>
    </div>
  ),
});

export default function DriverMapPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={true} />
    </>
  );
}
