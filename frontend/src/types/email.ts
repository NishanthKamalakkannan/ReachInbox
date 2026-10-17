export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface Email {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  attempts: number;
  bullJobId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    subject: string;
    hourlyLimit?: number;
  };
  sender?: {
    email: string;
  };
}

export interface ScheduledEmailsResponse {
  emails: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalScheduled: number;
  totalProcessing: number;
  totalSent: number;
  totalFailed: number;
  totalCampaigns: number;
  sendersCount: number;
  rateLimit: {
    currentHourSent: number;
    hourlyLimit: number;
    currentWindowUtc: string;
  };
}
