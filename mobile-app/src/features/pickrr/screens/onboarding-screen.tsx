import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFirstTime } from '@/lib/hooks';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';

export function OnboardingScreen() {
  const router = useRouter();
  const [, setIsFirstTime] = useIsFirstTime();

  return (
    <CinematicScreen contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.overline}>PICKRR MOBILE</Text>
        <Text style={styles.title}>Control your media queue from anywhere.</Text>
        <Text style={styles.copy}>
          Search TMDB, discover trending picks, send torrents to qBittorrent, and monitor lifecycle status in one cinematic command center.
        </Text>
      </View>

      <View style={styles.permissionCard}>
        <Text style={styles.permissionTitle}>Before you continue</Text>
        <Text style={styles.permissionItem}>1. Push notifications keep you updated when downloads finish or fail.</Text>
        <Text style={styles.permissionItem}>2. Network access is required to control Pickrr backend services.</Text>
        <Text style={styles.permissionItem}>3. Admin-only settings are protected by role-based controls.</Text>
      </View>

      <ActionButton
        label="Start Secure Login"
        onPress={() => {
          setIsFirstTime(false);
          router.replace('/(auth)/login');
        }}
      />
    </CinematicScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 22,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,124,54,0.4)',
    backgroundColor: 'rgba(14,20,34,0.96)',
    gap: 12,
  },
  overline: {
    color: '#FFB084',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F5F9FF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  copy: {
    color: '#A4B7D0',
    fontSize: 14,
    lineHeight: 22,
  },
  permissionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(20,28,44,0.92)',
    gap: 10,
  },
  permissionTitle: {
    color: '#F7FBFF',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionItem: {
    color: '#9AB0CC',
    fontSize: 13,
    lineHeight: 20,
  },
});
