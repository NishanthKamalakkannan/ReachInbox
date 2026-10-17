import React from 'react';
import { Email } from '../../types/email';
import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { format } from 'date-fns';
import { CheckCircle2, Mail, Calendar, AlertCircle } from 'lucide-react';

interface SentEmailsProps {
  emails: Email[];
  loading: boolean;
  onOpenCompose: () => void;
}

export const SentEmails: React.FC<SentEmailsProps> = ({
  emails,
  loading,
  onOpenCompose,
}) => {
  if (loading) {
    return <Loading message="Loading delivered outbound logs..." />;
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title="No sent emails yet"
        description="Emails dispatched by the BullMQ worker will be archived here once successfully delivered."
        actionText="Compose New Campaign"
        onAction={onOpenCompose}
        icon={<CheckCircle2 className="w-12 h-12 text-slate-500 mb-4 stroke-1" />}
      />
    );
  }

  const columns = [
    {
      header: 'Recipient',
      cell: (email: Email) => (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="font-medium text-slate-100">{email.recipient}</span>
        </div>
      ),
    },
    {
      header: 'Subject',
      cell: (email: Email) => (
        <span className="text-slate-300 max-w-xs truncate block" title={email.subject}>
          {email.subject}
        </span>
      ),
    },
    {
      header: 'Sent Timestamp',
      cell: (email: Email) => {
        if (!email.sentAt) return <span className="text-xs text-slate-500">-</span>;
        const date = new Date(email.sentAt);
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{format(date, 'MMM d, yyyy HH:mm:ss')}</span>
          </div>
        );
      },
    },
    {
      header: 'Sender',
      cell: (email: Email) => (
        <span className="text-xs text-slate-400 font-mono">
          {email.sender?.email || 'Default Sender'}
        </span>
      ),
    },
    {
      header: 'Delivery Status',
      cell: (email: Email) => (
        <div>
          <Badge status={email.status} />
          {email.errorMessage && (
            <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {email.errorMessage}
            </p>
          )}
        </div>
      ),
    },
  ];

  return <Table columns={columns} data={emails} keyExtractor={(e) => e.id} />;
};
