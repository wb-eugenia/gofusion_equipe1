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
        return 'bg-red-100';
      case 'success':
        return 'bg-green-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'info':
        return 'bg-blue-100';
      case 'confirm':
        return 'bg-purple-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'confirm':
        return 'bg-purple-600 hover:bg-purple-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl animate-fadeIn">
        <div className="flex items-center justify-center mb-4">
          <div className={`w-16 h-16 ${getBgColor()} rounded-full flex items-center justify-center`}>
            <span className="text-3xl">{getIcon()}</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-gray-700 text-center mb-6 whitespace-pre-line">{message}</p>
        <div className={`flex gap-3 ${showCancel ? '' : 'justify-center'}`}>
          {showCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm || onCancel}
            className={`${showCancel ? 'flex-1' : 'w-full'} px-4 py-2 ${getButtonColor()} text-white rounded-lg transition font-semibold`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

