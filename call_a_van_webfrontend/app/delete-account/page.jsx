'use client';
import MapEngine from '@/sections/MapEngine/MapEngine';
import ToastManager from '@/components/ui/ToastManager';

export default function DeleteAccountPage() {
  return (
    <>
      <ToastManager />
      <MapEngine isDriverMode={false} isDeleteAccount={true} />
    </>
  );
}
