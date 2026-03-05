import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

export function SectionHeader({ title, subtitle, ctaLabel, onPressCta }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {ctaLabel ? (
        <Pressable onPress={onPressCta}>
          <Text style={styles.cta}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  left: {
    flexShrink: 1,
    gap: 4,
  },
  title: {
    color: '#F7FAFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#98ABC4',
    fontSize: 12,
  },
  cta: {
    color: '#FF7C36',
    fontSize: 13,
    fontWeight: '700',
  },
});
