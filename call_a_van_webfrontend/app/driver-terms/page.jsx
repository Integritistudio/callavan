'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function DriverTermsPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={false} isDriverTerms={true} />
    </>
  );
}
