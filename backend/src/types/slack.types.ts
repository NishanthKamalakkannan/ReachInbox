export interface SlackOAuthTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id?: string;
  app_id: string;
  team: {
    name: string;
    id: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
  };
  error?: string;
}

export interface SlackRateLimitNotificationPayload {
  senderEmail: string;
  hourlyLimit: number;
  currentWindow: string;
  rescheduledWindow: string;
}
