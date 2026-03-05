export type MediaType = 'movie' | 'tv';

export type MobileAuthProvider = 'local' | 'jellyfin';

export type MobilePlatform = 'ios' | 'android' | 'web' | 'unknown';

export type DownloadStatus = 'downloading' | 'done' | 'failed' | 'paused';

export type MobileNotificationType
  = | 'download_completed'
    | 'download_failed'
    | 'download_paused'
    | 'download_resumed'
    | 'download_deleted'
    | 'download_started';

export type MobileToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

export type MobileUser = {
  id: string;
  username: string;
  role: string;
};

export type MobileLoginRequest = {
  provider: MobileAuthProvider;
  username: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  platform?: MobilePlatform;
  appVersion?: string;
};

export type MobileLoginResponse = {
  token: MobileToken;
  user: MobileUser;
};

export type MobileRefreshRequest = {
  refreshToken: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  platform?: MobilePlatform;
  appVersion?: string;
};

export type MobileRefreshResponse = {
  token: MobileToken;
  user: MobileUser;
};

export type TMDBMedia = {
  tmdbId: number;
  title: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  voteCount: number;
  mediaType: MediaType;
  genres: string[];
  language: string | null;
  inJellyfin: boolean;
};

export type TMDBTrailer = {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  url: string;
};

export type TMDBReview = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  url: string | null;
  rating: number | null;
};

export type TMDBCastMember = {
  id: number;
  name: string;
  character: string | null;
  profileUrl: string | null;
};

export type TMDBDetails = TMDBMedia & {
  runtimeMinutes: number | null;
  seasons: number[];
  trailers: TMDBTrailer[];
  primaryTrailer: TMDBTrailer | null;
  reviews: TMDBReview[];
  cast: TMDBCastMember[];
};

export type DiscoverSection
  = | 'trending'
    | 'trending_movies'
    | 'trending_tv'
    | 'now_playing'
    | 'upcoming'
    | 'on_the_air'
    | 'popular_movies'
    | 'popular_tv'
    | 'top_rated_movies'
    | 'top_rated_tv'
    | 'bollywood'
    | 'hollywood'
    | 'recommendations'
    | 'netflix'
    | 'prime'
    | 'disney'
    | 'apple'
    | 'max'
    | 'hulu';

export type DiscoverResponse = {
  section: DiscoverSection;
  label: string;
  results: TMDBMedia[];
  page: number;
  totalPages: number;
  totalResults: number;
  appliedMediaType: MediaType;
  appliedFilters: {
    language: string | null;
    region: string | null;
    releaseYear: number | null;
    minRating: number;
    sort: string;
  };
};

export type TorrentResult = {
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
};

export type DownloadQueueRequest = {
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
};

export type AppDownload = {
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
};

export type LibraryItem = {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  posterPath: string | null;
  isFavorite: boolean;
  inWatchlist: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LibraryResponse = {
  list: 'favorites' | 'watchlist' | 'all';
  results: LibraryItem[];
};

export type LibraryStatusResponse = {
  tmdbId: number;
  mediaType: MediaType;
  isFavorite: boolean;
  inWatchlist: boolean;
  hasEntry: boolean;
};

export type MobileNotification = {
  id: string;
  type: MobileNotificationType;
  title: string;
  body: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type MobileNotificationListResponse = {
  unreadCount: number;
  notifications: MobileNotification[];
};

export type SettingsPayload = {
  PROWLARR_URL: string;
  PROWLARR_API_KEY: string;
  QBIT_URL: string;
  QBIT_USERNAME: string;
  QBIT_PASSWORD: string;
  TMDB_API_KEY: string;
  JELLYFIN_URL: string;
  JELLYFIN_API_KEY: string;
  MOVIES_SAVE_PATH: string;
  TV_SAVE_PATH: string;
};
