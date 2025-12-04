'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  show: boolean;
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  show,
  type,
  message,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-success to-green-400',
          icon: '✅',
          ring: 'ring-4 ring-success/30',
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-error to-red-400',
          icon: '❌',
          ring: 'ring-4 ring-error/30',
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-secondary to-yellow-300',
          icon: '⚠️',
          ring: 'ring-4 ring-secondary/30',
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-blue-400',
          icon: 'ℹ️',
          ring: 'ring-4 ring-blue-500/30',
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-primary to-primary',
          icon: 'ℹ️',
          ring: 'ring-4 ring-primary/30',
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed top-4 right-4 z-[60] animate-[slideUpFade_0.3s_ease-out]">
      <div className={`${styles.bg} ${styles.ring} rounded-2xl shadow-lift p-4 min-w-[300px] max-w-md`}>
        <div className="flex items-center gap-3">
          <div className="text-3xl flex-shrink-0">{styles.icon}</div>
          <p className="text-white font-bold flex-1">{message}</p>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl flex-shrink-0 transition"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
