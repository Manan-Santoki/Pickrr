import { Worker, Job } from 'bullmq';
import { db } from '@/lib/db';
import { getTMDBMetadata } from '@/services/tmdb';
import type { WebhookJobData } from '@/lib/queue';

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

const worker = new Worker<WebhookJobData>(
  'webhook-jobs',
  async (job: Job<WebhookJobData>) => {
    const { overseerrId, tmdbId, mediaType, title, requestedBy } = job.data;

    // Fetch TMDB metadata
    const meta = await getTMDBMetadata(tmdbId, mediaType);

    // Upsert request in DB (idempotent for retries)
    await db.request.upsert({
      where: { overseerrId },
      create: {
        overseerrId,
        tmdbId,
        mediaType,
        title: meta?.title ?? title,
        year: meta?.year ?? null,
        posterPath: meta?.posterUrl ?? null,
        overview: meta?.overview ?? null,
        status: 'awaiting_selection',
        requestedBy,
      },
      update: {
        status: 'awaiting_selection',
      },
    });

    console.log(`[Worker] Job ${job.id} completed: ${title} (overseerrId: ${overseerrId})`);
  },
  { connection: getRedisConnection() }
);

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
