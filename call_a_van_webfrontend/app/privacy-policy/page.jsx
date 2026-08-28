'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function PrivacyPolicyPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={false} isPrivacyPolicy={true} />
    </>
  );
}
