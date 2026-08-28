'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function DriverFAQPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={false} isDriverFAQ={true} />
    </>
  );
}
