import * as React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function LoadingPanel({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.panel}>
      <ActivityIndicator color="#FF7C36" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function EmptyPanel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.label}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <View style={[styles.panel, styles.error]}>
      <Text style={styles.errorTitle}>Something broke</Text>
      <Text style={styles.label}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(19,29,46,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    borderColor: 'rgba(235,77,103,0.5)',
  },
  title: {
    color: '#F4F8FF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorTitle: {
    color: '#FFC5CF',
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    color: '#96A9C2',
    textAlign: 'center',
  },
});
