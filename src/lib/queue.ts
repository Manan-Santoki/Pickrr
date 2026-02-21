import { Queue } from 'bullmq';

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

export const webhookQueue = new Queue('webhook-jobs', {
  connection: getRedisConnection(),
});

export interface WebhookJobData {
  overseerrId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  requestedBy: string;
}

export async function enqueueWebhookJob(data: WebhookJobData) {
  await webhookQueue.add('process-request', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
