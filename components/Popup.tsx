'use client';

import { useEffect } from 'react';

export type PopupType = 'error' | 'success' | 'warning' | 'info' | 'confirm';

export interface PopupProps {
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

export default function Popup({
  show,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Annuler',
  showCancel = false,
}: PopupProps) {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'confirm':
        return '❓';
      default:
        return 'ℹ️';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'error':
        return 'bg-error/10';
      case 'success':
        return 'bg-success/10';
      case 'warning':
        return 'bg-secondary/20';
      case 'info':
        return 'bg-primary/10';
      case 'confirm':
        return 'bg-primary/10';
      default:
        return 'bg-inactive/20';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-error hover:shadow-lift';
      case 'success':
        return 'bg-success hover:shadow-lift';
      case 'warning':
        return 'bg-secondary text-text hover:shadow-lift';
      case 'info':
        return 'bg-primary hover:shadow-lift';
      case 'confirm':
        return 'bg-primary hover:shadow-lift';
      default:
        return 'bg-textMuted hover:shadow-lift';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full shadow-lift" style={{ animation: 'scaleIn 0.3s ease-out' }}>
        <div className="flex items-center justify-center mb-4">
          <div className={`w-16 h-16 ${getBgColor()} rounded-full flex items-center justify-center`}>
            <span className="text-3xl">{getIcon()}</span>
          </div>
        </div>
        <h3 className="text-xl font-bold font-inter text-text text-center mb-2">{title}</h3>
        <p className="text-textMuted text-center mb-6 whitespace-pre-line">{message}</p>
        <div className={`flex gap-3 ${showCancel ? '' : 'justify-center'}`}>
          {showCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-surface border-2 border-border text-text rounded-lg hover:bg-hover active:scale-[0.98] transition-all duration-200 font-medium min-h-[48px]"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm || onCancel}
            className={`${showCancel ? 'flex-1' : 'w-full'} px-4 py-2 ${getButtonColor()} text-white rounded-lg active:scale-[0.98] transition-all duration-200 font-medium min-h-[48px]`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

