'use client';

import { useState } from 'react';
import Popup, { PopupType } from '@/components/Popup';

export interface PopupState {
  show: boolean;
  type: PopupType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export function usePopup() {
  const [popup, setPopup] = useState<PopupState>({
    show: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showPopup = (
    type: PopupType,
    title: string,
    message: string,
    options?: {
      onConfirm?: () => void;
      onCancel?: () => void;
      confirmText?: string;
      cancelText?: string;
      showCancel?: boolean;
    }
  ) => {
    setPopup({
      show: true,
      type,
      title,
      message,
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel || (() => setPopup({ ...popup, show: false })),
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      showCancel: options?.showCancel,
    });
  };

  const showError = (message: string, title: string = 'Erreur') => {
    showPopup('error', title, message);
  };

  const showSuccess = (message: string, title: string = 'Succès') => {
    showPopup('success', title, message);
  };

  const showWarning = (message: string, title: string = 'Attention') => {
    showPopup('warning', title, message);
  };

  const showInfo = (message: string, title: string = 'Information') => {
    showPopup('info', title, message);
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    title: string = 'Confirmer',
    confirmText: string = 'Confirmer',
    cancelText: string = 'Annuler'
  ) => {
    showPopup('confirm', title, message, {
      onConfirm: () => {
        onConfirm();
        setPopup({ ...popup, show: false });
      },
      onCancel: () => setPopup({ ...popup, show: false }),
      confirmText,
      cancelText,
      showCancel: true,
    });
  };

  const hidePopup = () => {
    setPopup({ ...popup, show: false });
  };

  const PopupComponent = () => (
    <Popup
      show={popup.show}
      type={popup.type}
      title={popup.title}
      message={popup.message}
      onConfirm={popup.onConfirm || hidePopup}
      onCancel={popup.onCancel}
      confirmText={popup.confirmText}
      cancelText={popup.cancelText}
      showCancel={popup.showCancel}
    />
  );

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showConfirm,
    hidePopup,
    PopupComponent,
  };
}

