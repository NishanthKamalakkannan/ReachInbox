export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface SlackStatus {
  connected: boolean;
  teamId?: string;
  channelId?: string;
  channelName?: string;
  connectedAt?: string;
}
