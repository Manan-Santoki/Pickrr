import type { QbitTorrent } from '@/types/qbittorrent';
import { getConfigValue } from '@/lib/settings';

let qbitCookie: string | null = null;
let cookieExpiry = 0;

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
  if (qbitCookie && Date.now() < cookieExpiry) {
    return qbitCookie;
  }

  const { url, username, password } = await getQbitConfig();
  if (!url) {
    throw new Error('qBittorrent not configured — set QBIT_URL in Settings or env');
  }

  const res = await fetch(`${url}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
    cache: 'no-store',
  });

  const cookie = res.headers.get('set-cookie');
  if (!res.ok || !cookie) {
    throw new Error('qBittorrent auth failed — check URL/credentials');
  }

  qbitCookie = cookie.split(';')[0];
  cookieExpiry = Date.now() + 3600 * 1000;
  return qbitCookie;
}

export async function addTorrent(
  source: { downloadUrl?: string | null; magnetUrl?: string | null },
  savePath: string,
  mediaType: 'movie' | 'tv'
): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  const torrentUrl = source.magnetUrl ?? source.downloadUrl;
  if (!torrentUrl) {
    throw new Error('No torrent source URL provided');
  }

  const category = mediaType === 'movie' ? 'movies' : 'tv';
  const tag = category;

  const form = new URLSearchParams({
    urls: torrentUrl,
    savepath: savePath,
    category,
    tags: tag,
  });

  const res = await fetch(`${url}/api/v2/torrents/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: form,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`qBittorrent add torrent failed (${res.status})`);
  }
}

export async function getPickrrTorrents(): Promise<QbitTorrent[]> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  const res = await fetch(`${url}/api/v2/torrents/info`, {
    headers: { Cookie: cookie },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  const all = (await res.json()) as QbitTorrent[];
  return all.filter((torrent) => ['movies', 'tv', 'pickrr'].includes(torrent.category));
}

export async function getTorrentByHash(hash: string): Promise<QbitTorrent | null> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  const res = await fetch(`${url}/api/v2/torrents/info?hashes=${hash}`, {
    headers: { Cookie: cookie },
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const torrents = (await res.json()) as QbitTorrent[];
  return torrents[0] ?? null;
}

export async function pauseTorrent(hash: string): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  await fetch(`${url}/api/v2/torrents/pause`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: new URLSearchParams({ hashes: hash }),
    cache: 'no-store',
  });
}

export async function resumeTorrent(hash: string): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  await fetch(`${url}/api/v2/torrents/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: new URLSearchParams({ hashes: hash }),
    cache: 'no-store',
  });
}

export async function deleteTorrent(hash: string, deleteFiles = false): Promise<void> {
  const { url } = await getQbitConfig();
  const cookie = await getAuthCookie();

  await fetch(`${url}/api/v2/torrents/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: new URLSearchParams({ hashes: hash, deleteFiles: String(deleteFiles) }),
    cache: 'no-store',
  });
}

export async function testQbitConnection(): Promise<boolean> {
  try {
    await getAuthCookie();
    return true;
  } catch {
    return false;
  }
}
