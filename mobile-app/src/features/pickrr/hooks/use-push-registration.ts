import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as React from 'react';
import { Platform } from 'react-native';
import { registerDevice } from '@/features/pickrr/api';
import { useAuthStore } from '@/features/auth/use-auth-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushRegistration() {
  const session = useAuthStore.use.session();

  React.useEffect(() => {
    let cancelled = false;

    async function registerPushToken() {
      if (!session) {
        return;
      }

      try {
        const existingPermission = await Notifications.getPermissionsAsync();
        let finalStatus = existingPermission.status;

        if (finalStatus !== 'granted') {
          const permission = await Notifications.requestPermissionsAsync();
          finalStatus = permission.status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId
          ?? Constants.easConfig?.projectId
          ?? undefined;

        const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!tokenResult.data || cancelled) {
          return;
        }

        await registerDevice({
          expoPushToken: tokenResult.data,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
          appVersion: Constants.expoConfig?.version,
        });
      } catch {
        // Push registration failures must not block app usage.
      }
    }

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);
}
