// components/ui/ToastManager.jsx
// Centralized toast queue — mirrors Flutter's overlay system

'use client';
import { useState, useCallback, useRef } from 'react';
import Toast from './Toast';

let _showToast = null;

export function showNotification(message, isError = false) {
  if (_showToast) _showToast(message, isError);
}

export default function ToastManager() {
  const [toasts, setToasts] = useState([]);
  const queueRef = useRef(Promise.resolve());

  const addToast = useCallback((message, isError) => {
    queueRef.current = queueRef.current.then(() => {
      return new Promise((resolve) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        setToasts((prev) => {
          // Avoid duplicate identical toasts currently showing
          if (prev.some(t => t.message === message)) return prev;
          return [...prev.slice(-2), { id, message, isError }];
        });
        // 400ms gap before processing the next toast in the queue
        setTimeout(resolve, 400);
      });
    });
  }, []);

  // Register the global trigger
  _showToast = addToast;

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-24 right-4 z-[99999] flex flex-col gap-2">
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
