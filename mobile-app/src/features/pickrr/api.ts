import type {
  AppDownload,
  DiscoverResponse,
  DiscoverSection,
  LibraryResponse,
  LibraryStatusResponse,
  MediaType,
  MobileLoginRequest,
  MobileLoginResponse,
  MobileNotificationListResponse,
  MobileRefreshResponse,
  SettingsPayload,
  TMDBDetails,
  TMDBMedia,
  TorrentResult,
} from '@/types/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api';

type SearchType = 'all' | 'movie' | 'tv';

type DiscoverSimpleResponse = {
  results: TMDBMedia[];
};

type DownloadsResponse = AppDownload[];

type LibraryListType = 'favorites' | 'watchlist' | 'all';

export const pickrrQueryKeys = {
  me: ['mobile-me'] as const,
  search: (query: string, type: SearchType) => ['tmdb-search', query, type] as const,
  mediaDetail: (id: number, type: MediaType) => ['tmdb-detail', id, type] as const,
  discoverSection: (section: DiscoverSection) => ['discover-section', section] as const,
  discoverCategory: (section: DiscoverSection, filters: Record<string, unknown>) =>
    ['discover-category', section, filters] as const,
  downloads: ['downloads'] as const,
  downloadDetail: (id: string) => ['download-detail', id] as const,
  library: (list: LibraryListType) => ['library', list] as const,
  libraryStatus: (tmdbId: number, mediaType: MediaType) => ['library-status', tmdbId, mediaType] as const,
  notifications: ['mobile-notifications'] as const,
  settings: ['settings'] as const,
};

export async function mobileLogin(payload: MobileLoginRequest): Promise<MobileLoginResponse> {
  const response = await client.post<MobileLoginResponse>('/api/mobile/auth/login', payload);
  return response.data;
}

export async function mobileRefresh(payload: {
  refreshToken: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  platform?: string;
  appVersion?: string;
}): Promise<MobileRefreshResponse> {
  const response = await client.post<MobileRefreshResponse>('/api/mobile/auth/refresh', payload);
  return response.data;
}

export async function mobileLogout(payload?: { refreshToken?: string; allDevices?: boolean }): Promise<void> {
  await client.post('/api/mobile/auth/logout', payload ?? {});
}

export function useMobileMe() {
  return useQuery({
    queryKey: pickrrQueryKeys.me,
    queryFn: async () => {
      const response = await client.get<{ id: string; username: string; role: string }>('/api/mobile/auth/me');
      return response.data;
    },
  });
}

export async function registerDevice(payload: {
  expoPushToken: string;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  appVersion?: string;
}) {
  const response = await client.post('/api/mobile/devices', payload);
  return response.data;
}

export function useTmdbSearch(query: string, type: SearchType) {
  return useQuery({
    queryKey: pickrrQueryKeys.search(query, type),
    enabled: query.trim().length > 1,
    queryFn: async () => {
      const tmdbType = type === 'all' ? 'multi' : type;
      const response = await client.get<{ results: TMDBMedia[] }>('/api/tmdb/search', {
        params: {
          query,
          type: tmdbType,
        },
      });
      return response.data.results;
    },
  });
}

export function useMediaDetail(id: number, mediaType: MediaType) {
  return useQuery({
    queryKey: pickrrQueryKeys.mediaDetail(id, mediaType),
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const response = await client.get<TMDBDetails>(`/api/tmdb/${id}`, {
        params: {
          type: mediaType,
        },
      });
      return response.data;
    },
  });
}

export function useDiscoverSection(section: DiscoverSection) {
  return useQuery({
    queryKey: pickrrQueryKeys.discoverSection(section),
    queryFn: async () => {
      const response = await client.get<DiscoverSimpleResponse>('/api/discover', {
        params: { section },
      });
      return response.data.results;
    },
  });
}

export function useDiscoverCategory(params: {
  section: DiscoverSection;
  page: number;
  limit?: number;
  mediaType?: MediaType;
  language?: string;
  region?: string;
  releaseYear?: number;
  minRating?: number;
  sort?: string;
}) {
  return useQuery({
    queryKey: pickrrQueryKeys.discoverCategory(params.section, params),
    queryFn: async () => {
      const response = await client.get<DiscoverResponse>('/api/discover/category', {
        params,
      });
      return response.data;
    },
  });
}

export async function searchTorrents(query: string, mediaType: MediaType): Promise<TorrentResult[]> {
  const response = await client.get<{ results: TorrentResult[] }>('/api/torrents/search', {
    params: {
      query,
      type: mediaType,
      limit: 50,
    },
  });

  return response.data.results;
}

export async function queueDownload(payload: {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year?: number | null;
  posterPath?: string | null;
  torrentTitle: string;
  indexer: string;
  size: number;
  seeders: number;
  downloadUrl?: string | null;
  magnetUrl?: string | null;
  savePath?: string;
}) {
  const response = await client.post<{ ok: boolean; id: string }>('/api/download', payload);
  return response.data;
}

export function useDownloads() {
  return useQuery({
    queryKey: pickrrQueryKeys.downloads,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await client.get<DownloadsResponse>('/api/downloads');
      return response.data;
    },
  });
}

export function useDownloadDetail(downloadId: string) {
  return useQuery({
    queryKey: pickrrQueryKeys.downloadDetail(downloadId),
    enabled: Boolean(downloadId),
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await client.get<AppDownload>(`/api/downloads/${downloadId}`);
      return response.data;
    },
  });
}

export async function updateDownloadAction(payload: {
  hash: string;
  action: 'pause' | 'resume' | 'delete';
  deleteFiles?: boolean;
}) {
  const response = await client.post<{ ok: boolean }>('/api/downloads/remove', payload);
  return response.data;
}

export function useLibrary(list: LibraryListType) {
  return useQuery({
    queryKey: pickrrQueryKeys.library(list),
    queryFn: async () => {
      const response = await client.get<LibraryResponse>('/api/library', {
        params: {
          list,
        },
      });
      return response.data;
    },
  });
}

export function useLibraryStatus(tmdbId: number, mediaType: MediaType) {
  return useQuery({
    queryKey: pickrrQueryKeys.libraryStatus(tmdbId, mediaType),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0,
    queryFn: async () => {
      const response = await client.get<LibraryStatusResponse>('/api/library/status', {
        params: {
          tmdbId,
          mediaType,
        },
      });
      return response.data;
    },
  });
}

export async function updateLibraryStatus(payload: {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year?: number | null;
  posterPath?: string | null;
  isFavorite?: boolean;
  inWatchlist?: boolean;
}) {
  const response = await client.put<LibraryStatusResponse>('/api/library/status', payload);
  return response.data;
}

export function useNotifications(limit = 80) {
  return useQuery({
    queryKey: [...pickrrQueryKeys.notifications, limit],
    refetchInterval: 10_000,
    queryFn: async () => {
      const response = await client.get<MobileNotificationListResponse>('/api/mobile/notifications', {
        params: { limit },
      });
      return response.data;
    },
  });
}

export async function markNotificationsRead(payload: { ids?: string[]; markAll?: boolean }) {
  const response = await client.post<{ ok: boolean; updatedCount: number }>(
    '/api/mobile/notifications/read',
    payload
  );
  return response.data;
}

export function useSettings() {
  return useQuery({
    queryKey: pickrrQueryKeys.settings,
    queryFn: async () => {
      const response = await client.get<SettingsPayload>('/api/settings');
      return response.data;
    },
  });
}

export async function saveSettings(payload: SettingsPayload) {
  const response = await client.put<{ ok: boolean }>('/api/settings', payload);
  return response.data;
}

export async function testServiceConnection(service: 'prowlarr' | 'qbittorrent' | 'tmdb' | 'jellyfin') {
  const response = await client.post<{ ok: boolean; service: string; error?: string }>(
    '/api/settings/test',
    { service }
  );
  return response.data;
}

export const useLoginMutation = () =>
  useMutation({
    mutationFn: mobileLogin,
  });
