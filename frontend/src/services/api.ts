import axios from 'axios';
import { User, SlackStatus } from '../types/auth';
import { Email, ScheduledEmailsResponse, DashboardStats } from '../types/email';
import { Campaign, Sender, ScheduleCampaignPayload } from '../types/campaign';

export const baseURL = ((import.meta as any).env?.VITE_API_URL as string) || '';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Authentication
  auth: {
    getMe: async (): Promise<User> => {
      const res = await apiClient.get<{ success: boolean; data: User }>('/api/auth/me');
      return res.data.data;
    },
    logout: async (): Promise<void> => {
      await apiClient.post('/api/auth/logout');
    },
    demoLogin: async (): Promise<{ token: string; user: User }> => {
      const res = await apiClient.post<{ success: boolean; data: { token: string; user: User } }>(
        '/api/auth/demo-login'
      );
      return res.data.data;
    },
  },

  // Emails
  emails: {
    schedule: async (payload: ScheduleCampaignPayload) => {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        '/api/emails/schedule',
        payload
      );
      return res.data.data;
    },
    getScheduled: async (page = 1, limit = 50): Promise<ScheduledEmailsResponse> => {
      const res = await apiClient.get<{ success: boolean; data: ScheduledEmailsResponse }>(
        `/api/emails/scheduled?page=${page}&limit=${limit}`
      );
      return res.data.data;
    },
    getSent: async (page = 1, limit = 50): Promise<ScheduledEmailsResponse> => {
      const res = await apiClient.get<{ success: boolean; data: ScheduledEmailsResponse }>(
        `/api/emails/sent?page=${page}&limit=${limit}`
      );
      return res.data.data;
    },
    search: async (query: string): Promise<Email[]> => {
      const res = await apiClient.get<{ success: boolean; data: Email[] }>(
        `/api/emails/search?q=${encodeURIComponent(query)}`
      );
      return res.data.data;
    },
    getById: async (id: string): Promise<Email> => {
      const res = await apiClient.get<{ success: boolean; data: Email }>(`/api/emails/${id}`);
      return res.data.data;
    },
  },

  // Campaigns & Senders
  campaigns: {
    getAll: async (): Promise<Campaign[]> => {
      const res = await apiClient.get<{ success: boolean; data: Campaign[] }>('/api/campaigns');
      return res.data.data;
    },
    getSenders: async (): Promise<Sender[]> => {
      const res = await apiClient.get<{ success: boolean; data: Sender[] }>('/api/campaigns/senders');
      return res.data.data;
    },
  },

  // Slack Integration
  slack: {
    getStatus: async (): Promise<SlackStatus> => {
      const res = await apiClient.get<{ success: boolean; data: SlackStatus }>('/api/slack/status');
      return res.data.data;
    },
    disconnect: async (): Promise<void> => {
      await apiClient.post('/api/slack/disconnect');
    },
  },

  // Dashboard Stats
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      const res = await apiClient.get<{ success: boolean; data: DashboardStats }>('/api/dashboard/stats');
      return res.data.data;
    },
  },
};
