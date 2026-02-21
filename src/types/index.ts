export type MediaType = 'movie' | 'tv';

export type RequestStatus =
  | 'pending'
  | 'searching'
  | 'awaiting_selection'
  | 'selected'
  | 'downloading'
  | 'done'
  | 'failed';

export type UserRole = 'admin' | 'selector' | 'viewer';

export interface AppTorrent {
  id: string;
  requestId: string;
  title: string;
  indexer: string;
  size: string; // BigInt serialized to string
  seeders: number;
  leechers: number;
  infoUrl: string | null;
  downloadUrl: string;
  magnetUrl: string | null;
  qbitHash: string | null;
  selectedAt: string;
  selectedBy: string;
}

export interface AppRequest {
  id: string;
  overseerrId: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview: string | null;
  status: RequestStatus;
  requestedBy: string;
  requestedAt: string;
  selectedTorrent: AppTorrent | null;
  createdAt: string;
  updatedAt: string;
}
