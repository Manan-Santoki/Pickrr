import type { TMDBMedia } from '@/types/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type MediaCardProps = {
  item: TMDBMedia;
  onPress?: (item: TMDBMedia) => void;
  compact?: boolean;
};

const fallbackPoster
  = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

export function MediaCard({ item, onPress, compact = false }: MediaCardProps) {
  return (
    <Pressable
      style={[styles.card, compact ? styles.cardCompact : undefined]}
      onPress={() => onPress?.(item)}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
    >
      <View style={styles.posterWrap}>
        <Image
          source={{ uri: item.posterUrl ?? fallbackPoster }}
          style={[styles.poster, compact ? styles.posterCompact : undefined]}
          contentFit="cover"
          transition={180}
        />
        {item.inJellyfin
          ? (
              <View style={styles.jellyfinBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#0ABF53" />
              </View>
            )
          : null}
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        <Text style={styles.subtitle}>
          {item.mediaType.toUpperCase()}
          {' '}
          •
          {item.year ?? 'NA'}
          {' '}
          • ★
          {item.rating.toFixed(1)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 164,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(16,24,38,0.92)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    marginRight: 12,
  },
  cardCompact: {
    width: '100%',
    flexDirection: 'row',
    marginRight: 0,
    marginBottom: 12,
  },
  poster: {
    width: '100%',
    height: 230,
  },
  posterWrap: {
    position: 'relative',
  },
  posterCompact: {
    width: 110,
    height: 145,
  },
  jellyfinBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,12,20,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(10,191,83,0.45)',
  },
  meta: {
    padding: 10,
    gap: 6,
  },
  title: {
    color: '#F5F8FF',
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: '#95A7C0',
    fontSize: 12,
  },
});
