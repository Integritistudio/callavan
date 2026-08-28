'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function FAQPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={false} isFAQ={true} />
    </>
  );
}
