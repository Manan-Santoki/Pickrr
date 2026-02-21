import type { ProwlarrResult, ProwlarrSearchResponse } from '@/types/prowlarr';

const getProwlarrConfig = () => ({
  url: process.env.PROWLARR_URL!,
  apiKey: process.env.PROWLARR_API_KEY!,
});

export async function searchProwlarr(
  query: string,
  type: 'movie' | 'tv',
  limit = 50
): Promise<ProwlarrResult[]> {
  const { url, apiKey } = getProwlarrConfig();

  const params = new URLSearchParams({
    query,
    type: type === 'movie' ? 'movie' : 'tvsearch',
    limit: limit.toString(),
  });

  const res = await fetch(`${url}/api/v1/search?${params}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 }, // never cache search results
  });

  if (!res.ok) {
    throw new Error(`Prowlarr search failed: ${res.status} ${res.statusText}`);
  }

  const data: ProwlarrSearchResponse = await res.json();

  // Normalize and sort by seeders descending
  return data
    .map((item) => ({
      guid: item.guid,
      title: item.title,
      indexer: item.indexer,
      indexerId: item.indexerId,
      size: item.size,
      seeders: item.seeders ?? 0,
      leechers: item.leechers ?? 0,
      infoUrl: item.infoUrl ?? null,
      downloadUrl: item.downloadUrl ?? null,
      magnetUrl: item.magnetUrl ?? null,
      publishDate: item.publishDate,
    }))
    .sort((a, b) => b.seeders - a.seeders);
}

export async function testProwlarrConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = getProwlarrConfig();
    const res = await fetch(`${url}/api/v1/system/status`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
