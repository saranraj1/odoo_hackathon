import React from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div onClick={onCancel} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" />

      {/* Container */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full mx-4 relative z-10 transform scale-100 transition-all duration-300 animate-scale-up">
        <div className="flex items-start space-x-4">
          <div
            className={clsx(
              'p-2 rounded-full',
              isDestructive ? 'bg-red-50 text-red-500' : 'bg-primary-50 text-primary-500'
            )}
          >
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={onCancel} className="btn-secondary py-1.5 px-3.5">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              'font-semibold py-1.5 px-3.5 rounded-md shadow-sm transition-all',
              isDestructive ? 'btn-danger' : 'btn-primary'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
