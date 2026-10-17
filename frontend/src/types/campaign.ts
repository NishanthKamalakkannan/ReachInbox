export interface Sender {
  id: string;
  userId: string;
  email: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  createdAt: string;
  _count?: {
    emails: number;
  };
}

export interface ScheduleCampaignPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderId: string;
}
