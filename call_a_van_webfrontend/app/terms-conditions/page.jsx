'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function TermsConditionsPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={false} isTerms={true} />
    </>
  );
}
