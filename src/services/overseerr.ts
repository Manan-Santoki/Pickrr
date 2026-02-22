import { getConfigValue } from '@/lib/settings';

async function getOverseerrConfig() {
  const [url, apiKey] = await Promise.all([
    getConfigValue('OVERSEERR_URL'),
    getConfigValue('OVERSEERR_API_KEY'),
  ]);
  return {
    url: url ?? '',
    apiKey: apiKey ?? '',
  };
}

export async function getRequestDetails(requestId: number) {
  const { url, apiKey } = await getOverseerrConfig();
  if (!url || !apiKey) return null;

  const res = await fetch(`${url}/api/v1/request/${requestId}`, {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!res.ok) return null;
  return res.json();
}

export interface OverseerrRequest {
  id: number;
  status: number; // 1=pending, 2=approved, 3=declined
  media: {
    mediaType: 'movie' | 'tv';
    tmdbId: number;
    // Media status: 1=unknown, 2=pending, 3=processing, 4=partially_available, 5=available
    status: number;
  };
  seasons?: Array<{ seasonNumber: number }>;
  requestedBy: {
    displayName: string;
    username?: string;
  };
  createdAt: string;
}

/**
 * Delete an Overseerr request (removes it entirely).
 */
export async function deleteOverseerrRequest(requestId: number): Promise<void> {
  const { url, apiKey } = await getOverseerrConfig();
  if (!url || !apiKey) return;

  try {
    await fetch(`${url}/api/v1/request/${requestId}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey },
    });
  } catch (err) {
    console.error('[Overseerr] Failed to delete request:', err);
  }
}

/**
 * Fetch all pending/approved requests from Overseerr.
 * Used for the initial sync when webhook was not configured.
 */
export async function getOverseerrRequests(
  page = 1,
  pageSize = 20
): Promise<{ results: OverseerrRequest[]; pageInfo: { pages: number; page: number; results: number } }> {
  const { url, apiKey } = await getOverseerrConfig();
  if (!url || !apiKey) throw new Error('Overseerr not configured');

  const res = await fetch(
    `${url}/api/v1/request?take=${pageSize}&skip=${(page - 1) * pageSize}&sort=added&filter=all`,
    {
      headers: { 'X-Api-Key': apiKey },
      cache: 'no-store',
    }
  );

  if (!res.ok) throw new Error(`Overseerr API error: ${res.status}`);
  return res.json();
}

/**
 * Approve an Overseerr request (marks it as approved).
 * Call this when a torrent is selected.
 */
export async function approveOverseerrRequest(requestId: number): Promise<void> {
  const { url, apiKey } = await getOverseerrConfig();
  if (!url || !apiKey) return;

  try {
    await fetch(`${url}/api/v1/request/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('[Overseerr] Failed to approve request:', err);
  }
}

/**
 * Mark an Overseerr request as available (download complete).
 * Call this when the qBit download finishes.
 */
export async function markOverseerrAvailable(requestId: number): Promise<void> {
  const { url, apiKey } = await getOverseerrConfig();
  if (!url || !apiKey) return;

  try {
    await fetch(`${url}/api/v1/request/${requestId}/available`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('[Overseerr] Failed to mark request available:', err);
  }
}

export async function testOverseerrConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = await getOverseerrConfig();
    if (!url || !apiKey) return false;
    const res = await fetch(`${url}/api/v1/status`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
