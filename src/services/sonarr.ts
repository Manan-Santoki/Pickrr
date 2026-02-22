import { getConfigValue } from '@/lib/settings';

async function getSonarrConfig() {
  const [url, apiKey] = await Promise.all([
    getConfigValue('SONARR_URL'),
    getConfigValue('SONARR_API_KEY'),
  ]);
  return {
    url: url ?? '',
    apiKey: apiKey ?? '',
  };
}

export async function notifySonarrDownloadComplete(): Promise<void> {
  const { url, apiKey } = await getSonarrConfig();
  if (!url || !apiKey) return;

  await fetch(`${url}/api/v3/command`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'DownloadedEpisodesScan' }),
  });
}

export async function getSonarrSeries(tvdbId: number) {
  const { url, apiKey } = await getSonarrConfig();
  if (!url || !apiKey) return null;

  try {
    const res = await fetch(`${url}/api/v3/series?tvdbId=${tvdbId}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) return null;
    const series = await res.json();
    return series[0] ?? null;
  } catch {
    return null;
  }
}

export async function getSonarrQueue() {
  const { url, apiKey } = await getSonarrConfig();
  if (!url || !apiKey) return [];

  try {
    const res = await fetch(`${url}/api/v3/queue?includeUnknownSeriesItems=false`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.records ?? [];
  } catch {
    return [];
  }
}

/**
 * Remove a series from Sonarr by tmdbId (does not delete files).
 */
export async function deleteSonarrSeries(tmdbId: number): Promise<void> {
  const { url, apiKey } = await getSonarrConfig();
  if (!url || !apiKey) return;

  try {
    // Sonarr series lookup is by tvdbId; we search by tmdbId via the lookup endpoint
    const res = await fetch(`${url}/api/v3/series/lookup?term=tmdb:${tmdbId}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) return;
    const results = await res.json();
    const series = results.find((s: { id?: number }) => s.id);
    if (!series?.id) return;

    await fetch(`${url}/api/v3/series/${series.id}?deleteFiles=false&addImportExclusion=false`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey },
    });
  } catch (err) {
    console.error('[Sonarr] Failed to delete series:', err);
  }
}

export async function testSonarrConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = await getSonarrConfig();
    if (!url || !apiKey) return false;
    const res = await fetch(`${url}/api/v3/system/status`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
