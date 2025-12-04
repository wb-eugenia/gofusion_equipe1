'use client';

import { useState, useCallback } from 'react';
import Toast, { ToastType } from '@/components/Toast';

export function useToast() {
  const [toast, setToast] = useState({
    show: false,
    type: 'success' as ToastType,
    message: '',
  });

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ show: true, type, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast('success', message);
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast('error', message);
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast('info', message);
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast('warning', message);
  }, [showToast]);

  const ToastComponent = () => (
    <Toast
      show={toast.show}
      type={toast.type}
      message={toast.message}
      onClose={hideToast}
    />
  );

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    ToastComponent,
  };
}
