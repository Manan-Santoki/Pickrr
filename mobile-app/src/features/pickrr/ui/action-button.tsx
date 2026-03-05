import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function ActionButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ActionButtonProps) {
  const variantStyle =
    variant === 'danger' ? styles.danger : variant === 'secondary' ? styles.secondary : styles.primary;

  return (
    <Pressable
      style={[styles.button, variantStyle, disabled ? styles.disabled : undefined]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
    >
      {loading ? <ActivityIndicator color="#F8FBFF" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: '#F34D06',
    borderWidth: 1,
    borderColor: '#FF7C36',
  },
  secondary: {
    backgroundColor: 'rgba(36,50,72,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(125,150,182,0.35)',
  },
  danger: {
    backgroundColor: '#B6203D',
    borderWidth: 1,
    borderColor: '#EB4D67',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: '#F8FBFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
