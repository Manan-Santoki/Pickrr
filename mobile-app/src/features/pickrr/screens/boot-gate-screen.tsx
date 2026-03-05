import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hydrateAuth, useAuthStore } from '@/features/auth/use-auth-store';
import { useIsFirstTime } from '@/lib/hooks';
import { useMandatoryUpdateCheck } from '../hooks/use-mandatory-update-check';
import { CinematicScreen } from '../ui/cinematic-screen';
import { LoadingPanel } from '../ui/state-panels';

export function BootGateScreen() {
  const status = useAuthStore.use.status();
  const [isFirstTime] = useIsFirstTime();
  const updateCheck = useMandatoryUpdateCheck();

  React.useEffect(() => {
    hydrateAuth();
  }, []);

  React.useEffect(() => {
    if (status !== 'hydrating' && !updateCheck.checking) {
      void SplashScreen.hideAsync();
    }
  }, [status, updateCheck.checking]);

  if (status === 'hydrating' || updateCheck.checking) {
    return (
      <CinematicScreen scroll={false} contentContainerStyle={styles.center}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>PICKRR</Text>
          <Text style={styles.tagline}>Discovery. Control. Delivery.</Text>
        </View>
        <LoadingPanel label="Bootstrapping secure session" />
      </CinematicScreen>
    );
  }

  if (updateCheck.needsUpdate) {
    return (
      <CinematicScreen scroll={false} contentContainerStyle={styles.center}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>PICKRR</Text>
          <Text style={styles.tagline}>{updateCheck.message || 'Update required to continue.'}</Text>
        </View>
      </CinematicScreen>
    );
  }

  if (isFirstTime) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)/search" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  brandBlock: {
    marginBottom: 22,
    gap: 10,
  },
  brand: {
    fontSize: 46,
    color: '#F5F9FF',
    fontWeight: '900',
    letterSpacing: 3.2,
  },
  tagline: {
    color: '#9AB0CC',
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
