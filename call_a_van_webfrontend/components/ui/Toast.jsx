// components/ui/Toast.jsx
// Mirrors Flutter's _showNotification overlay system

'use client';
import { useEffect, useState } from 'react';

export default function Toast({ message, isError = false, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold w-72 ${
        visible ? 'toast-enter' : 'toast-exit'
      } ${isError ? 'bg-red-500' : 'bg-[#1AB451]'}`}
    >
      <span className="text-lg">{isError ? '⚠️' : '✅'}</span>
      <span className="flex-1">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }} className="opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}
