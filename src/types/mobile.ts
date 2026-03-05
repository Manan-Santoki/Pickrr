export type MobileAuthProvider = 'local' | 'jellyfin';

export type MobilePlatform = 'ios' | 'android' | 'web' | 'unknown';

export type MobileNotificationType =
  | 'download_completed'
  | 'download_failed'
  | 'download_paused'
  | 'download_resumed'
  | 'download_deleted'
  | 'download_started';

export type MobileTokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
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
  token: MobileTokenPair;
  user: {
    id: string;
    username: string;
    role: string;
  };
};

export type MobileRefreshRequest = {
  refreshToken: string;
  deviceId?: string;
  appVersion?: string;
};

export type MobileLogoutRequest = {
  refreshToken?: string;
  allDevices?: boolean;
};

export type MobileMeResponse = {
  id: string;
  username: string;
  role: string;
};

export type RegisterDeviceRequest = {
  expoPushToken: string;
  platform: MobilePlatform;
  appVersion?: string;
};

export type MobileNotificationDTO = {
  id: string;
  type: MobileNotificationType;
  title: string;
  body: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ListMobileNotificationsResponse = {
  unreadCount: number;
  notifications: MobileNotificationDTO[];
};

export type MarkNotificationsReadRequest = {
  ids?: string[];
  markAll?: boolean;
};
