import React from 'react';
import { clsx } from 'clsx';
import { EmailStatus } from '../types/email';
import { Clock, Send, AlertTriangle, RefreshCw } from 'lucide-react';

interface BadgeProps {
  status: EmailStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const normalized = status.toLowerCase();

  switch (normalized) {
    case 'scheduled':
      return (
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20',
            className
          )}
        >
          <Clock className="w-3 h-3" />
          Scheduled
        </span>
      );
    case 'processing':
      return (
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse',
            className
          )}
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
    case 'sent':
      return (
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            className
          )}
        >
          <Send className="w-3 h-3" />
          Sent
        </span>
      );
    case 'failed':
      return (
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20',
            className
          )}
        >
          <AlertTriangle className="w-3 h-3" />
          Failed
        </span>
      );
    default:
      return (
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700',
            className
          )}
        >
          {status}
        </span>
      );
  }
};
