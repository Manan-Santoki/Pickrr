const getRadarrConfig = () => ({
  url: process.env.RADARR_URL!,
  apiKey: process.env.RADARR_API_KEY!,
});

export async function notifyRadarrDownloadComplete(tmdbId: number): Promise<void> {
  const { url, apiKey } = getRadarrConfig();

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
  const { url, apiKey } = getRadarrConfig();

  const res = await fetch(`${url}/api/v3/movie?tmdbId=${tmdbId}`, {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!res.ok) return null;
  const movies = await res.json();
  return movies[0] ?? null;
}

export async function testRadarrConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = getRadarrConfig();
    const res = await fetch(`${url}/api/v3/system/status`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
