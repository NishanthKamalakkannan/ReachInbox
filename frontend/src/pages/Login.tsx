import React from 'react';
import { Button } from '../components/Button';
import { Zap, ShieldCheck, Clock, Hash, Database, Sparkles } from 'lucide-react';
import { baseURL } from '../services/api';

interface LoginProps {
  onDemoLogin: () => Promise<any>;
}

export const Login: React.FC<LoginProps> = ({ onDemoLogin }) => {
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    const msg = params.get('message');
    if (err) {
      setErrorMsg(msg || `OAuth Error: ${err}`);
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${baseURL}/auth/google`;
  };

  const handleDemoClick = async () => {
    try {
      setDemoLoading(true);
      await onDemoLogin();
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-xl shadow-brand-500/20 mb-4">
            <svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">ReachInbox</h1>
          <p className="mt-2 text-sm text-slate-400">
            Outbound Email Job Scheduler & Infrastructure Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7 shadow-2xl backdrop-blur-xl space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            {/* Primary Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Quick Demo Mode */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-500 uppercase tracking-wider">
                Or evaluation mode
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleDemoClick}
              loading={demoLoading}
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
              className="w-full border-slate-700/80 hover:bg-slate-800 text-slate-200"
            >
              Sign In as Demo Reviewer
            </Button>
          </div>

          {/* Architecture Highlights Pill Grid */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span>BullMQ Delayed Queue</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
              <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Distributed Rate Limit</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Elasticsearch Search</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
              <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Slack Rate Notifications</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Production-grade idempotent job execution with PostgreSQL & Redis
        </p>
      </div>
    </div>
  );
};
