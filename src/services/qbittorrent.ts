import type { QbitTorrent } from '@/types/qbittorrent';

let qbitCookie: string | null = null;
let cookieExpiry: number = 0;

const getQbitConfig = () => ({
  url: process.env.QBIT_URL!,
  username: process.env.QBIT_USERNAME!,
  password: process.env.QBIT_PASSWORD!,
});

async function getAuthCookie(): Promise<string> {
  if (qbitCookie && Date.now() < cookieExpiry) return qbitCookie;

  const { url, username, password } = getQbitConfig();

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

export async function addTorrentByUrl(
  downloadUrl: string,
  savePath: string,
  tags: string[] = ['pickrr']
): Promise<void> {
  const { url } = getQbitConfig();
  const cookie = await getAuthCookie();

  const form = new URLSearchParams({
    urls: downloadUrl,
    savepath: savePath,
    tags: tags.join(','),
    category: 'pickrr',
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
  savePath: string
): Promise<void> {
  return addTorrentByUrl(magnetUrl, savePath);
}

export async function getTorrentsByHash(hashes: string[]): Promise<QbitTorrent[]> {
  const { url } = getQbitConfig();
  const cookie = await getAuthCookie();

  const res = await fetch(
    `${url}/api/v2/torrents/info?hashes=${hashes.join('|')}`,
    { headers: { Cookie: cookie } }
  );

  if (!res.ok) return [];
  return res.json();
}

export async function getActiveTorrents(): Promise<QbitTorrent[]> {
  const { url } = getQbitConfig();
  const cookie = await getAuthCookie();

  const res = await fetch(
    `${url}/api/v2/torrents/info?filter=active&category=pickrr`,
    { headers: { Cookie: cookie } }
  );

  if (!res.ok) return [];
  return res.json();
}

export async function getTorrentHashByName(name: string): Promise<string | null> {
  const { url } = getQbitConfig();
  const cookie = await getAuthCookie();

  const res = await fetch(`${url}/api/v2/torrents/info`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) return null;
  const torrents: QbitTorrent[] = await res.json();
  const match = torrents.find((t) => t.name.includes(name));
  return match?.hash ?? null;
}
