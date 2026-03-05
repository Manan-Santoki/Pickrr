import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SegmentOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.root}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, selected ? styles.optionSelected : undefined]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.optionText, selected ? styles.optionTextSelected : undefined]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    backgroundColor: 'rgba(21,30,47,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  option: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: 'rgba(255,100,23,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,124,54,0.55)',
  },
  optionText: {
    color: '#90A5C4',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optionTextSelected: {
    color: '#FFD7C0',
  },
});
