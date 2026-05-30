import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { sharedStyles } from '../../theme/styles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function SettingsScreen() {
  const { colors, isDarkMode, hapticEnabled, toggleDarkMode, toggleHapticEnabled } = useTheme();
  const backupEnabled = useSettingsStore((state) => state.backupEnabled);
  const toggleBackupEnabled = useSettingsStore((state) => state.toggleBackupEnabled);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title2, styles.pageTitle, { color: colors.text }]}>
          Settings
        </Text>

        <Text style={[sharedStyles.sectionHeader, { color: colors.textSecondary }]}>
          Preferences
        </Text>

        <View style={[sharedStyles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Text style={[typography.body, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.separator, true: '#34C75940' }}
              thumbColor={isDarkMode ? colors.success : colors.surface}
            />
          </View>

          <View style={[styles.separator, { backgroundColor: colors.separator }]} />

          <View style={styles.row}>
            <Text style={[typography.body, { color: colors.text }]}>Haptic Feedback</Text>
            <Switch
              value={hapticEnabled}
              onValueChange={toggleHapticEnabled}
              trackColor={{ false: colors.separator, true: '#34C75940' }}
              thumbColor={hapticEnabled ? colors.success : colors.surface}
            />
          </View>

          <View style={[styles.separator, { backgroundColor: colors.separator }]} />

          <View style={styles.row}>
            <Text style={[typography.body, { color: colors.text }]}>Backup Before Deletion</Text>
            <Switch
              value={backupEnabled}
              onValueChange={toggleBackupEnabled}
              trackColor={{ false: colors.separator, true: '#34C75940' }}
              thumbColor={backupEnabled ? colors.success : colors.surface}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  pageTitle: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
});
