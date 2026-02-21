const getSonarrConfig = () => ({
  url: process.env.SONARR_URL!,
  apiKey: process.env.SONARR_API_KEY!,
});

export async function notifySonarrDownloadComplete(): Promise<void> {
  const { url, apiKey } = getSonarrConfig();

  await fetch(`${url}/api/v3/command`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'DownloadedEpisodesScan' }),
  });
}

export async function testSonarrConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = getSonarrConfig();
    const res = await fetch(`${url}/api/v3/system/status`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
