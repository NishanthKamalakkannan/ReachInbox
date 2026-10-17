import React from 'react';
import { Email } from '../../types/email';
import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { format } from 'date-fns';
import { Mail, Clock, Calendar } from 'lucide-react';

interface ScheduledEmailsProps {
  emails: Email[];
  loading: boolean;
  onOpenCompose: () => void;
}

export const ScheduledEmails: React.FC<ScheduledEmailsProps> = ({
  emails,
  loading,
  onOpenCompose,
}) => {
  if (loading) {
    return <Loading message="Loading queued jobs from BullMQ & PostgreSQL..." />;
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title="No scheduled emails in queue"
        description="Schedule a new outbound campaign or upload leads via CSV to start sending."
        actionText="Compose New Email"
        onAction={onOpenCompose}
        icon={<Clock className="w-12 h-12 text-slate-500 mb-4 stroke-1" />}
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
      header: 'Scheduled For',
      cell: (email: Email) => {
        const date = new Date(email.scheduledAt);
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{format(date, 'MMM d, yyyy HH:mm:ss')}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({date.toISOString().substring(11, 19)} UTC)
            </span>
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
      header: 'Status',
      cell: (email: Email) => <Badge status={email.status} />,
    },
  ];

  return <Table columns={columns} data={emails} keyExtractor={(e) => e.id} />;
};
