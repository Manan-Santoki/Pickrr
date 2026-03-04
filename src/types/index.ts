export type MediaType = 'movie' | 'tv';

export type DownloadStatus = 'downloading' | 'done' | 'failed' | 'paused';

export interface AppDownload {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  posterPath: string | null;
  torrentTitle: string;
  indexer: string;
  size: string;
  seeders: number;
  downloadUrl: string;
  magnetUrl: string | null;
  qbitHash: string | null;
  savePath: string;
  status: DownloadStatus;
  createdAt: string;
  updatedAt: string;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  state: string | null;
  num_seeds: number;
  num_leechs: number;
  hash: string | null;
}
