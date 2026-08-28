'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function ContactPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={false} isContact={true} />
    </>
  );
}
