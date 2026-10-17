import { useState, useEffect, useCallback } from 'react';
import { User, SlackStatus } from '../types/auth';
import { api } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [slackLoading, setSlackLoading] = useState<boolean>(false);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.auth.getMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSlackStatus = useCallback(async () => {
    try {
      setSlackLoading(true);
      const status = await api.slack.getStatus();
      setSlackStatus(status);
    } catch {
      setSlackStatus({ connected: false });
    } finally {
      setSlackLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetchSlackStatus();
    }
  }, [user, fetchSlackStatus]);

  const logout = async () => {
    try {
      await api.auth.logout();
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const loginWithDemo = async () => {
    try {
      setLoading(true);
      const res = await api.auth.demoLogin();
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const disconnectSlack = async () => {
    await api.slack.disconnect();
    setSlackStatus({ connected: false });
  };

  return {
    user,
    loading,
    slackStatus,
    slackLoading,
    logout,
    loginWithDemo,
    refreshUser: fetchUser,
    refreshSlack: fetchSlackStatus,
    disconnectSlack,
  };
}
