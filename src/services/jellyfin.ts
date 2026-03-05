import { getConfigValue } from '@/lib/settings';
import type { MediaType, TMDBMedia } from '@/services/tmdb';

type JellyfinConfig = {
  apiKey: string;
  baseUrl: string;
};

type JellyfinItem = {
  Name?: string;
  ProductionYear?: number;
  ProviderIds?: Record<string, string>;
  Type?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const availabilityCache = new Map<string, { expiresAt: number; value: boolean }>();

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getCacheKey(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}:${tmdbId}`;
}

function readCache(cacheKey: string): boolean | null {
  const cached = availabilityCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    availabilityCache.delete(cacheKey);
    return null;
  }
  return cached.value;
}

function writeCache(cacheKey: string, value: boolean): void {
  availabilityCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function getTmdbProviderId(providerIds: Record<string, string> | undefined): string | undefined {
  if (!providerIds) return undefined;
  return providerIds.Tmdb
    ?? providerIds.TMDb
    ?? providerIds.tmdb
    ?? providerIds.TMDB;
}

async function getJellyfinConfig(): Promise<JellyfinConfig | null> {
  const [rawUrl, rawApiKey] = await Promise.all([
    getConfigValue('JELLYFIN_URL'),
    getConfigValue('JELLYFIN_API_KEY'),
  ]);

  if (!rawUrl || !rawApiKey) {
    return null;
  }

  return {
    baseUrl: rawUrl.replace(/\/$/, ''),
    apiKey: rawApiKey,
  };
}

async function fetchJellyfinItems(
  config: JellyfinConfig,
  params: Record<string, string>
): Promise<JellyfinItem[] | null> {
  try {
    const query = new URLSearchParams({
      ...params,
      api_key: config.apiKey,
    });

    const response = await fetch(`${config.baseUrl}/Items?${query.toString()}`, {
      cache: 'no-store',
      headers: {
        'X-Emby-Token': config.apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { Items?: JellyfinItem[] };
    return Array.isArray(payload.Items) ? payload.Items : [];
  } catch {
    return null;
  }
}

async function hasProviderMatch(
  config: JellyfinConfig,
  media: Pick<TMDBMedia, 'mediaType' | 'tmdbId'>
): Promise<boolean | null> {
  const includeItemTypes = media.mediaType === 'movie' ? 'Movie' : 'Series';
  const providerItems = await fetchJellyfinItems(config, {
    Recursive: 'true',
    IncludeItemTypes: includeItemTypes,
    AnyProviderIdEquals: `Tmdb.${media.tmdbId}`,
    Fields: 'ProviderIds,ProductionYear',
    Limit: '1',
  });

  if (providerItems === null) {
    return null;
  }

  if (providerItems.length > 0) {
    return true;
  }

  return false;
}

async function hasSearchMatch(
  config: JellyfinConfig,
  media: Pick<TMDBMedia, 'mediaType' | 'tmdbId' | 'title' | 'year'>
): Promise<boolean> {
  const includeItemTypes = media.mediaType === 'movie' ? 'Movie' : 'Series';
  const searchItems = await fetchJellyfinItems(config, {
    Recursive: 'true',
    IncludeItemTypes: includeItemTypes,
    SearchTerm: media.title,
    Fields: 'ProviderIds,ProductionYear',
    Limit: '24',
  });

  if (!searchItems || searchItems.length === 0) {
    return false;
  }

  const normalizedTitle = normalizeTitle(media.title);

  for (const candidate of searchItems) {
    const providerId = getTmdbProviderId(candidate.ProviderIds);
    if (providerId && Number(providerId) === media.tmdbId) {
      return true;
    }

    const candidateTitle = typeof candidate.Name === 'string'
      ? normalizeTitle(candidate.Name)
      : '';
    const candidateYear = Number(candidate.ProductionYear);

    if (!candidateTitle || candidateTitle !== normalizedTitle) {
      continue;
    }

    if (!media.year || !Number.isFinite(candidateYear) || Math.abs(candidateYear - media.year) <= 1) {
      return true;
    }
  }

  return false;
}

export async function isInJellyfin(
  media: Pick<TMDBMedia, 'mediaType' | 'tmdbId' | 'title' | 'year'>
): Promise<boolean> {
  const cacheKey = getCacheKey(media.tmdbId, media.mediaType);
  const cached = readCache(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const config = await getJellyfinConfig();
  if (!config) {
    writeCache(cacheKey, false);
    return false;
  }

  const providerMatch = await hasProviderMatch(config, media);
  if (providerMatch === true) {
    writeCache(cacheKey, true);
    return true;
  }

  const searchMatch = await hasSearchMatch(config, media);
  writeCache(cacheKey, searchMatch);
  return searchMatch;
}

export async function annotateWithJellyfinAvailability(items: TMDBMedia[]): Promise<TMDBMedia[]> {
  if (items.length === 0) {
    return items;
  }

  const checks = await Promise.all(
    items.map(async (item) => {
      const available = await isInJellyfin(item);
      return { ...item, inJellyfin: available };
    })
  );

  return checks;
}
