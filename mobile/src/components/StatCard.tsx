import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type StatCardProps = {
  value: string | number;
  label: string;
  accentColor?: string;
};

export default function StatCard({ value, label, accentColor }: StatCardProps) {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 132,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  accentBar: {
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
});