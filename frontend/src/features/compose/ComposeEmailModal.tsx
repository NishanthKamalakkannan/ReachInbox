import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { Button } from '../../components/Button';
import { CsvUploader } from './CsvUploader';
import { Sender, ScheduleCampaignPayload } from '../../types/campaign';
import { Calendar, Clock, Gauge, UserCheck, Send } from 'lucide-react';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  onSchedule: (payload: ScheduleCampaignPayload) => Promise<any>;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  senders,
  onSchedule,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  // Default start time: current time + 1 minute formatted for datetime-local
  const defaultStartTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [senderId, setSenderId] = useState(senders[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync senderId if senders loaded after mount
  React.useEffect(() => {
    if (!senderId && senders.length > 0) {
      setSenderId(senders[0].id);
    }
  }, [senders, senderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Please provide an email subject.');
      return;
    }
    if (!body.trim()) {
      setError('Please provide email body text.');
      return;
    }
    if (recipients.length === 0) {
      setError('Please upload at least one valid recipient lead.');
      return;
    }
    if (!senderId) {
      setError('Please select an active outbound sender.');
      return;
    }

    try {
      setLoading(true);
      await onSchedule({
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails: delaySeconds * 1000,
        hourlyLimit,
        senderId,
      });
      onClose();
      // Reset form
      setSubject('');
      setBody('');
      setRecipients([]);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose Outbound Campaign" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Sender Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-brand-400" />
            Outbound Sender
          </label>
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.email}
              </option>
            ))}
          </select>
        </div>

        {/* Lead Upload */}
        <CsvUploader
          onEmailsExtracted={(emails) => setRecipients(emails)}
          extractedEmails={recipients}
        />

        {/* Subject */}
        <Input
          label="Subject"
          placeholder="e.g. Quick question regarding your outbound pipeline"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        {/* Body */}
        <Textarea
          label="Email Content"
          placeholder="Hi there, I noticed your team is expanding outreach..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          required
        />

        {/* Scheduling Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              Delay / Email (sec)
            </label>
            <input
              type="number"
              min="0"
              max="3600"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-brand-400" />
              Hourly Limit
            </label>
            <input
              type="number"
              min="1"
              max="5000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={loading}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Schedule Campaign ({recipients.length} {recipients.length === 1 ? 'Job' : 'Jobs'})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
