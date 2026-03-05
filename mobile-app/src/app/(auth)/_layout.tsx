import { Redirect, Stack } from 'expo-router';
import * as React from 'react';
import { useAuthStore } from '@/features/auth/use-auth-store';

export default function AuthLayout() {
  const status = useAuthStore.use.status();

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)/search" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
