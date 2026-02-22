import type { QbitTorrent } from '@/types/qbittorrent';
import { getConfigValue } from '@/lib/settings';

let qbitCookie: string | null = null;
let cookieExpiry: number = 0;

async function getQbitConfig() {
  const [url, username, password] = await Promise.all([
    getConfigValue('QBIT_URL'),
    getConfigValue('QBIT_USERNAME'),
    getConfigValue('QBIT_PASSWORD'),
  ]);
  return {
    url: url ?? '',
    username: username ?? '',
    password: password ?? '',
  };
}

async function getAuthCookie(): Promise<string> {
  if (qbitCookie && Date.now() < cookieExpiry) return qbitCookie;

  const { url, username, password } = await getQbitConfig();
  if (!url) throw new Error('qBittorrent not configured — set QBIT_URL in Settings');

  const res = await fetch(`${url}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
  });

  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('qBittorrent auth failed — check credentials');

  qbitCookie = cookie.split(';')[0];
  cookieExpiry = Date.now() + 3600 * 1000; // 1 hour
  return qbitCookie;
}

/**
 * Add a torrent to qBittorrent.
 * Category and tag are set per media type:
 *   movie → category=movies, tags=movies
 *   tv    → category=tv,     tags=tv
 */
export async function addTorrentByUrl(
  downloadUrl: string,
  savePath: string,
  mediaType: 'movie' | 'tv' = 'movie'
): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  const category = mediaType === 'movie' ? 'movies' : 'tv';
  const tag = mediaType === 'movie' ? 'movies' : 'tv';

  const form = new URLSearchParams({
    urls: downloadUrl,
    savepath: savePath,
    tags: tag,
    category,
  });

  const res = await fetch(`${url}/api/v2/torrents/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: form,
  });

  if (!res.ok) throw new Error(`qBit add torrent failed: ${res.status}`);
}

export async function addTorrentByMagnet(
  magnetUrl: string,
  savePath: string,
  mediaType: 'movie' | 'tv' = 'movie'
): Promise<void> {
  return addTorrentByUrl(magnetUrl, savePath, mediaType);
}

export async function getTorrentsByHash(hashes: string[]): Promise<QbitTorrent[]> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  const res = await fetch(
    `${url}/api/v2/torrents/info?hashes=${hashes.join('|')}`,
    { headers: { Cookie: cookie } }
  );

  if (!res.ok) return [];
  return res.json();
}

/**
 * Get all torrents that are currently in-progress (not yet fully seeded/completed).
 * Shows downloading, stalled, paused, queued, checking, error states —
 * everything a user would care about tracking.
 */
export async function getAllPickrrTorrents(): Promise<QbitTorrent[]> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  // Fetch ALL torrents — filter server-side to exclude fully completed+old ones
  const res = await fetch(`${url}/api/v2/torrents/info`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) return [];

  const all: QbitTorrent[] = await res.json();

  // Show: anything not 100% complete, OR completed within last 24h, OR in error
  const cutoff = Date.now() / 1000 - 86400; // 24h ago in unix seconds
  return all.filter((t) => {
    if (t.progress < 1) return true;                       // still downloading
    if (t.state === 'error' || t.state === 'missingFiles') return true;
    if (t.completion_on && t.completion_on > cutoff) return true; // finished recently
    return false;
  });
}

export async function getTorrentHashByName(name: string): Promise<string | null> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  const res = await fetch(`${url}/api/v2/torrents/info`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) return null;
  const torrents: QbitTorrent[] = await res.json();
  const match = torrents.find((t) => t.name.includes(name));
  return match?.hash ?? null;
}

export async function pauseTorrent(hash: string): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();
  await fetch(`${url}/api/v2/torrents/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ hashes: hash }),
  });
}

export async function resumeTorrent(hash: string): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();
  await fetch(`${url}/api/v2/torrents/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ hashes: hash }),
  });
}

export async function deleteTorrent(hash: string, deleteFiles = false): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();
  await fetch(`${url}/api/v2/torrents/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({ hashes: hash, deleteFiles: String(deleteFiles) }),
  });
}

export async function testQbitConnection(): Promise<boolean> {
  try {
    const { url } = await getQbitConfig();
    if (!url) return false;
    await getAuthCookie();
    return true;
  } catch {
    return false;
  }
}
