import { getConfigValue } from '@/lib/settings';

async function getRadarrConfig() {
  const [url, apiKey] = await Promise.all([
    getConfigValue('RADARR_URL'),
    getConfigValue('RADARR_API_KEY'),
  ]);
  return {
    url: url ?? '',
    apiKey: apiKey ?? '',
  };
}

export async function notifyRadarrDownloadComplete(tmdbId: number): Promise<void> {
  const { url, apiKey } = await getRadarrConfig();
  if (!url || !apiKey) return;

  // Trigger manual import scan for downloaded movies
  await fetch(`${url}/api/v3/command`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'DownloadedMoviesScan' }),
  });
}

export async function getRadarrMovie(tmdbId: number) {
  const { url, apiKey } = await getRadarrConfig();
  if (!url || !apiKey) return null;

  const res = await fetch(`${url}/api/v3/movie?tmdbId=${tmdbId}`, {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!res.ok) return null;
  const movies = await res.json();
  return movies[0] ?? null;
}

export async function getRadarrQueue() {
  const { url, apiKey } = await getRadarrConfig();
  if (!url || !apiKey) return [];

  try {
    const res = await fetch(`${url}/api/v3/queue?includeUnknownMovieItems=false`, {
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
 * Remove a movie from Radarr by tmdbId (does not delete files).
 */
export async function deleteRadarrMovie(tmdbId: number): Promise<void> {
  const { url, apiKey } = await getRadarrConfig();
  if (!url || !apiKey) return;

  try {
    const movie = await getRadarrMovie(tmdbId);
    if (!movie?.id) return;
    await fetch(`${url}/api/v3/movie/${movie.id}?deleteFiles=false&addImportExclusion=false`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey },
    });
  } catch (err) {
    console.error('[Radarr] Failed to delete movie:', err);
  }
}

export async function testRadarrConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = await getRadarrConfig();
    if (!url || !apiKey) return false;
    const res = await fetch(`${url}/api/v3/system/status`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
