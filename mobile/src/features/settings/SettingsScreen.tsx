import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ConfirmDialog, ErrorState, LoadingSpinner, StatCard } from '../../components';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTheme } from '../../theme/ThemeContext';

export default function SettingsScreen() {
  const { colors, isDarkMode, hapticEnabled, toggleDarkMode, toggleHapticEnabled } = useTheme();
  const clearAllData = useSettingsStore((state) => state.clearAllData);

  const handleClearAllData = async () => {
    ConfirmDialog({
      title: 'Clear all data?',
      message: 'This will remove session data, saved user IDs, and app preferences from this device.',
      confirmText: 'Clear',
      destructive: true,
      onConfirm: async () => {
        try {
          await clearAllData();
        } catch (error) {
          Alert.alert('Unable to clear data', 'Please try again.');
        }
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Use a darker color palette across the app</Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={isDarkMode ? colors.primary : '#F4F4F5'} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Haptic Feedback</Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Vibrate on supported actions and confirmations</Text>
          </View>
          <Switch value={hapticEnabled} onValueChange={toggleHapticEnabled} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={hapticEnabled ? colors.primary : '#F4F4F5'} />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

        <View style={styles.aboutGrid}>
          <StatCard value="PhotoSwipe" label="App name" accentColor={colors.primary} />
          <StatCard value="1.0.0" label="Version" accentColor={colors.success} />
        </View>

        <View style={styles.aboutBlock}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Team Members</Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>Student A, Student B</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleClearAllData}
          style={({ pressed }) => [
            styles.clearButton,
            { backgroundColor: colors.danger, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={styles.clearButtonText}>Clear All Data</Text>
        </Pressable>
      </View>

      <View style={styles.footerNote}>
        <LoadingSpinner message="Settings are saved automatically." size="small" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  aboutGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  aboutBlock: {
    marginTop: 4,
    gap: 4,
  },
  aboutLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  aboutValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    marginTop: 4,
  },
  clearButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerNote: {
    marginTop: 'auto',
  },
});
