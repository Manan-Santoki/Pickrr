import { Link } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CinematicScreen } from '@/features/pickrr/ui/cinematic-screen';

export default function NotFoundScreen() {
  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Route not found</Text>
        <Text style={styles.subtitle}>The screen you requested does not exist in this build.</Text>
        <Link href="/(tabs)/search" style={styles.link}>
          Return to Search
        </Link>
      </View>
    </CinematicScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  panel: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    gap: 10,
  },
  title: {
    color: '#F7FBFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#9AB0CC',
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: '#FF9B61',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
});
