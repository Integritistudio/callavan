'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function RootPage() {
  return (
    <>
      <ToastManager />
      {/* We always render MapEngine since it handles both customer and driver state internally based on login */}
      <MapEngine isDriverMode={false} />
    </>
  );
}
