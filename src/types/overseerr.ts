export interface OverseerrWebhookPayload {
  notification_type: string;
  subject: string;
  message?: string;
  media: {
    media_type: 'movie' | 'tv';
    tmdbId: number;
    status: string;
  };
  request: {
    id: number;
    requestedBy_username?: string;
    requestedBy_email?: string;
  };
}
