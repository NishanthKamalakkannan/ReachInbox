import React from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { SlackStatus } from '../../types/auth';
import { Hash, CheckCircle2, AlertCircle, Unlink, ExternalLink } from 'lucide-react';

interface SlackConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackStatus: SlackStatus;
  onDisconnect: () => Promise<void>;
}

export const SlackConnectionModal: React.FC<SlackConnectionModalProps> = ({
  isOpen,
  onClose,
  slackStatus,
  onDisconnect,
}) => {
  const [disconnecting, setDisconnecting] = React.useState(false);

  const handleConnect = () => {
    // Redirect to backend Slack OAuth entrypoint
    window.location.href = '/api/slack/connect';
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Slack Real-time Alerts" maxWidth="md">
      <div className="space-y-5">
        {/* Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/30">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Slack Outbound Monitor</h4>
            <p className="text-xs text-slate-400">
              Receive instant alerts when sender hourly rate limits are reached.
            </p>
          </div>
        </div>

        {/* Status display */}
        {slackStatus.connected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Slack Workspace Connected
              </div>
              <p className="text-xs text-emerald-300/80">
                Connected to Channel:{' '}
                <span className="font-mono font-medium text-white">
                  {slackStatus.channelName || '#general'}
                </span>
              </p>
              {slackStatus.teamId && (
                <p className="text-[11px] text-emerald-300/60 font-mono">
                  Team ID: {slackStatus.teamId}
                </p>
              )}
            </div>

            <div className="text-xs text-slate-400 space-y-1 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
              <span className="font-semibold text-slate-300">How alerting works:</span>
              <p>
                When any sender reaches their configured rate limit (e.g., 100 emails/hr),
                ReachInbox sends a Slack alert and automatically defers queued emails to the next
                UTC hour window with Redis-based deduplication to prevent notification spam.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                loading={disconnecting}
                icon={<Unlink className="w-3.5 h-3.5" />}
              >
                Disconnect Slack
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                No Slack Workspace Connected
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your team workspace via OAuth to receive alerts when rate limits are triggered
                or when jobs are rescheduled.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnect}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Connect Slack via OAuth
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
