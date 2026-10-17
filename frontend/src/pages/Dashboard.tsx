import React, { useState, useEffect } from 'react';
import { User, SlackStatus } from '../types/auth';
import { useEmails } from '../hooks/useEmails';
import { Header } from '../components/Header';
import { StatCards } from '../features/stats/StatCards';
import { SearchBar } from '../features/search/SearchBar';
import { ScheduledEmails } from '../features/scheduled/ScheduledEmails';
import { SentEmails } from '../features/sent/SentEmails';
import { ComposeEmailModal } from '../features/compose/ComposeEmailModal';
import { SlackConnectionModal } from '../features/slack/SlackConnectionModal';
import { Table } from '../components/Table';
import { Badge } from '../components/Badge';
import { Toast } from '../components/Toast';
import { Button } from '../components/Button';
import { Plus, RefreshCw, Clock, Send, Database, Calendar, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
  user: User;
  slackStatus: SlackStatus;
  onLogout: () => void;
  onDisconnectSlack: () => Promise<void>;
  onRefreshSlack: () => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  slackStatus,
  onLogout,
  onDisconnectSlack,
  onRefreshSlack,
}) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    scheduledEmails,
    sentEmails,
    searchResults,
    senders,
    stats,
    loadingScheduled,
    loadingSent,
    searching,
    refreshAll,
    performSearch,
    scheduleCampaign,
  } = useEmails();

  // Check query params for Slack connection status after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackParam = params.get('slack');
    const team = params.get('team');
    const message = params.get('message');

    if (slackParam === 'success') {
      setToast({
        type: 'success',
        message: `Slack successfully connected to ${team || 'workspace'}!`,
      });
      onRefreshSlack();
      window.history.replaceState({}, '', '/dashboard');
    } else if (slackParam === 'error') {
      setToast({
        type: 'error',
        message: `Slack connection failed: ${message || 'Unknown error'}`,
      });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [onRefreshSlack]);

  const handleScheduleSubmit = async (payload: any) => {
    const result = await scheduleCampaign(payload);
    setToast({
      type: 'success',
      message: `Successfully scheduled ${result.scheduledCount} email jobs in BullMQ!`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        user={user}
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Dashboard Metric Cards */}
        <StatCards stats={stats} />

        {/* Action Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Scheduled Emails</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'scheduled' ? 'bg-brand-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sent'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sent Emails</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'sent' ? 'bg-brand-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {sentEmails.length}
              </span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            {/* Elasticsearch Search Bar */}
            <SearchBar
              onSearch={performSearch}
              searching={searching}
              resultCount={searchResults ? searchResults.length : null}
            />

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="md"
              onClick={refreshAll}
              title="Refresh queue state"
              className="px-2.5 text-slate-400 hover:text-slate-100"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Compose New Email Primary Button */}
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsComposeOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Compose New Email
            </Button>
          </div>
        </div>

        {/* View Content: Search Results vs Scheduled / Sent Tab */}
        {searchResults !== null ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Elasticsearch Query Results ({searchResults.length})
              </span>
              <button
                onClick={() => performSearch('')}
                className="text-brand-400 hover:underline"
              >
                Clear Search
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                No matching emails found in Elasticsearch index.
              </div>
            ) : (
              <Table
                columns={[
                  {
                    header: 'Recipient',
                    cell: (e) => (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="font-medium text-slate-100">{e.recipient}</span>
                      </div>
                    ),
                  },
                  {
                    header: 'Subject',
                    cell: (e) => <span className="text-slate-300">{e.subject}</span>,
                  },
                  {
                    header: 'Scheduled / Sent Time',
                    cell: (e) => (
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {format(
                            new Date(e.sentAt || e.scheduledAt),
                            'MMM d, yyyy HH:mm:ss'
                          )}
                        </span>
                      </div>
                    ),
                  },
                  {
                    header: 'Status',
                    cell: (e) => <Badge status={e.status} />,
                  },
                ]}
                data={searchResults}
                keyExtractor={(e) => e.id}
              />
            )}
          </div>
        ) : activeTab === 'scheduled' ? (
          <ScheduledEmails
            emails={scheduledEmails}
            loading={loadingScheduled}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        ) : (
          <SentEmails
            emails={sentEmails}
            loading={loadingSent}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        )}
      </main>

      {/* Compose Campaign Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onSchedule={handleScheduleSubmit}
      />

      {/* Slack Connection Modal */}
      <SlackConnectionModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        slackStatus={slackStatus}
        onDisconnect={onDisconnectSlack}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
