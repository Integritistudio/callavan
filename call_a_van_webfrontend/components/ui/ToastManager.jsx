// components/ui/ToastManager.jsx
// Centralized toast queue — mirrors Flutter's overlay system

'use client';
import { useState, useCallback } from 'react';
import Toast from './Toast';

let _showToast = null;

export function showNotification(message, isError = false) {
  if (_showToast) _showToast(message, isError);
}

export default function ToastManager() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, isError) => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-2), { id, message, isError }]);
  }, []);

  // Register the global trigger
  _showToast = addToast;

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          isError={t.isError}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}
