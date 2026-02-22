export type MediaType = 'movie' | 'tv';

export type RequestStatus =
  | 'pending'
  | 'searching'
  | 'awaiting_selection'  // needs a torrent picked in Pickrr
  | 'selected'            // torrent picked, not yet sent
  | 'processing'          // approved in Overseerr, arr is auto-downloading
  | 'downloading'         // Pickrr sent to qBit, in progress
  | 'available'           // media is available (handled by arr or Pickrr)
  | 'done'                // Pickrr download completed
  | 'declined'            // request was declined
  | 'failed';

export type UserRole = 'admin' | 'selector' | 'viewer';

export interface AppTorrent {
  id: string;
  requestId: string;
  seasonNumber: number;
  title: string;
  indexer: string;
  size: string;
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
  seasons: number[] | null;
  status: RequestStatus;
  requestedBy: string;
  requestedAt: string;
  torrents: AppTorrent[];
  createdAt: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  provider: 'local' | 'jellyfin';
  createdAt: string;
}
