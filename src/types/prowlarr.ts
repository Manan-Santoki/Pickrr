export interface ProwlarrResult {
  guid: string;
  title: string;
  indexer: string;
  indexerId: number;
  size: number;
  seeders: number;
  leechers: number;
  infoUrl: string | null;
  downloadUrl: string | null;
  magnetUrl: string | null;
  publishDate: string;
}

export type ProwlarrSearchResponse = Array<{
  guid: string;
  title: string;
  indexer: string;
  indexerId: number;
  size: number;
  seeders?: number;
  leechers?: number;
  infoUrl?: string;
  downloadUrl?: string;
  magnetUrl?: string;
  publishDate: string;
}>;
