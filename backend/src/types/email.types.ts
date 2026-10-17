export type EmailStatusType = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  senderId: string;
  userId: string;
}

export interface ScheduleCampaignInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string; // ISO 8601 string
  delayBetweenEmails: number; // in milliseconds
  hourlyLimit: number;
  senderId: string;
}

export interface EmailSearchResult {
  id: string;
  recipient: string;
  subject: string;
  status: EmailStatusType;
  scheduledAt: string;
  sentAt?: string | null;
  campaignId: string;
  senderId: string;
  createdAt: string;
}

export interface SmtpSendResult {
  messageId: string;
  previewUrl?: string | false;
}
