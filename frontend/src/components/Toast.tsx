import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ToastProps {
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type = 'success', message, onClose }) => {
  return (
    <div
      className={clsx(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5',
        type === 'success' && 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200',
        type === 'error' && 'bg-rose-950/90 border-rose-500/30 text-rose-200',
        type === 'info' && 'bg-slate-900/90 border-slate-700 text-slate-200'
      )}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-white/10 transition-colors ml-2 text-current"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
