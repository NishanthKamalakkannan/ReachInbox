import React from 'react';
import { DashboardStats } from '../../types/email';
import { Clock, RefreshCw, Send, AlertTriangle, Gauge } from 'lucide-react';

interface StatCardsProps {
  stats: DashboardStats | null;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  if (!stats) return null;

  const currentSent = stats.rateLimit?.currentHourSent || 0;
  const limit = stats.rateLimit?.hourlyLimit || 100;
  const quotaPercent = Math.min(100, Math.round((currentSent / limit) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Scheduled Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Scheduled Queued</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-100">{stats.totalScheduled}</div>
        <div className="text-[11px] text-slate-500 mt-1">Delayed jobs in BullMQ</div>
      </div>

      {/* Processing Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">In Flight / Processing</span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-100">{stats.totalProcessing}</div>
        <div className="text-[11px] text-slate-500 mt-1">Claimed by concurrent workers</div>
      </div>

      {/* Sent Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Delivered Outbound</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Send className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-100">{stats.totalSent}</div>
        <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
          {stats.totalFailed > 0 && (
            <span className="text-rose-400 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" /> {stats.totalFailed} failed
            </span>
          )}
          {stats.totalFailed === 0 && 'All sent without errors'}
        </div>
      </div>

      {/* Rate Limit Meter Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Hourly Rate Limit</span>
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-100">{currentSent}</span>
          <span className="text-xs text-slate-400">/ {limit} hr</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              quotaPercent >= 90
                ? 'bg-rose-500'
                : quotaPercent >= 70
                ? 'bg-amber-500'
                : 'bg-brand-500'
            }`}
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-500 mt-1 font-mono">
          Window: {stats.rateLimit?.currentWindowUtc}
        </div>
      </div>
    </div>
  );
};
