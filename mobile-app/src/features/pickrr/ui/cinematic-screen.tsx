import type { ReactNode } from 'react';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';

type CinematicScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: object;
};

export function CinematicScreen({
  children,
  scroll = true,
  contentContainerStyle,
}: CinematicScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FocusAwareStatusBar />

      <View style={styles.background}>
        <View style={[styles.orb, styles.orbPrimary]} />
        <View style={[styles.orb, styles.orbSecondary]} />
        <View style={[styles.orb, styles.orbTertiary]} />
      </View>

      {scroll
        ? (
            <ScrollView
              contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          )
        : (
            <View style={[styles.scrollContent, contentContainerStyle]}>{children}</View>
          )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A14',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 220,
    height: 220,
    backgroundColor: 'rgba(255, 100, 23, 0.18)',
    top: -60,
    right: -40,
  },
  orbSecondary: {
    width: 190,
    height: 190,
    backgroundColor: 'rgba(79, 140, 255, 0.14)',
    top: 240,
    left: -70,
  },
  orbTertiary: {
    width: 260,
    height: 260,
    backgroundColor: 'rgba(255, 100, 23, 0.08)',
    bottom: -120,
    right: -90,
  },
});
