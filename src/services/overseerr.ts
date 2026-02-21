const getOverseerrConfig = () => ({
  url: process.env.OVERSEERR_URL!,
  apiKey: process.env.OVERSEERR_API_KEY!,
});

export async function getRequestDetails(requestId: number) {
  const { url, apiKey } = getOverseerrConfig();

  const res = await fetch(`${url}/api/v1/request/${requestId}`, {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function testOverseerrConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = getOverseerrConfig();
    const res = await fetch(`${url}/api/v1/status`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
