import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface DecisionDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onDecision: (decision: 'APPROVED' | 'REJECTED', note: string) => void;
  onClose: () => void;
}

export default function DecisionDialog({
  isOpen,
  title,
  message,
  onDecision,
  onClose,
}: DecisionDialogProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAction = (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !note.trim()) {
      setError('A decision note is required for rejections.');
      return;
    }
    setError('');
    onDecision(decision, note);
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />

      {/* Container */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full mx-4 relative z-10">
        <div className="flex items-start space-x-4 mb-4">
          <div className="p-2 rounded-full bg-primary-50 text-primary-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="space-y-1.5 mb-6">
          <label className="form-label">Decision Note / Justification</label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setError('');
            }}
            placeholder="Provide reasons for approval or rejection..."
            className="w-full min-h-[80px] p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-y"
          />
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="btn-secondary py-1.5 px-3.5"
          >
            Cancel
          </button>
          <button
            onClick={() => handleAction('REJECTED')}
            className="btn-danger py-1.5 px-3.5 bg-red-650"
          >
            Reject
          </button>
          <button
            onClick={() => handleAction('APPROVED')}
            className="btn-primary py-1.5 px-3.5"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
