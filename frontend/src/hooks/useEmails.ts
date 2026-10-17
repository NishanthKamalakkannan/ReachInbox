import { useState, useEffect, useCallback, useRef } from 'react';
import { Email, DashboardStats } from '../types/email';
import { Sender, ScheduleCampaignPayload } from '../types/campaign';
import { api } from '../services/api';

export function useEmails() {
  const [scheduledEmails, setScheduledEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [searchResults, setSearchResults] = useState<Email[] | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [loadingScheduled, setLoadingScheduled] = useState<boolean>(true);
  const [loadingSent, setLoadingSent] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<any>(null);

  const fetchScheduled = useCallback(async () => {
    try {
      setLoadingScheduled(true);
      const res = await api.emails.getScheduled();
      setScheduledEmails(res.emails);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load scheduled emails');
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      setLoadingSent(true);
      const res = await api.emails.getSent();
      setSentEmails(res.emails);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load sent emails');
    } finally {
      setLoadingSent(false);
    }
  }, []);

  const fetchSenders = useCallback(async () => {
    try {
      const res = await api.campaigns.getSenders();
      setSenders(res);
    } catch (err) {
      console.error('Failed to load senders', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.dashboard.getStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchScheduled();
    fetchSent();
    fetchStats();
  }, [fetchScheduled, fetchSent, fetchStats]);

  // Initial load
  useEffect(() => {
    refreshAll();
    fetchSenders();

    // Auto-refresh every 8 seconds so user watches BullMQ jobs progress live
    const interval = setInterval(refreshAll, 8000);
    return () => clearInterval(interval);
  }, [refreshAll, fetchSenders]);

  // Elasticsearch debounced search
  const performSearch = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.emails.search(query.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Elasticsearch search failed', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const scheduleCampaign = async (payload: ScheduleCampaignPayload) => {
    try {
      setScheduling(true);
      setError(null);
      const res = await api.emails.schedule(payload);
      refreshAll();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to schedule emails';
      setError(msg);
      throw new Error(msg);
    } finally {
      setScheduling(false);
    }
  };

  return {
    scheduledEmails,
    sentEmails,
    searchResults,
    senders,
    stats,
    loadingScheduled,
    loadingSent,
    searching,
    scheduling,
    error,
    refreshAll,
    performSearch,
    scheduleCampaign,
  };
}
