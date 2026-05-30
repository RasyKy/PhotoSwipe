import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorState } from '../../components';
import { analyticsApi, DashboardAnalytics, getSessions, SessionItem, OfflineError } from '../../services/analyticsApi';
import { sessionService } from '../../services/sessionService';
import { formatFileSize } from '../../utils/fileSize';
import { useTheme } from '../../theme/ThemeContext';
import { sharedStyles } from '../../theme/styles';
import { spacing } from '../../theme/spacing';

type LoadState = 'idle' | 'loading' | 'refreshing' | 'error' | 'ready';

const DASHBOARD_CACHE_KEY = 'photoswipe_dashboard_cache';

type DashboardCache = {
  analytics: DashboardAnalytics;
  sessions: SessionItem[];
  savedAt: number;
};

async function loadCache(): Promise<DashboardCache | null> {
  try {
    const raw = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
    return raw ? (JSON.parse(raw) as DashboardCache) : null;
  } catch {
    return null;
  }
}

async function saveCache(cache: DashboardCache): Promise<void> {
  try {
    await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // non-fatal
  }
}

function formatAge(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  return `${minutes} minutes ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function DashboardSkeleton() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pulse = useSharedValue(0.3);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const bone = (w: number | `${number}%`, h: number, extra?: object) => (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: 6, backgroundColor: '#E5E5EA' }, pulseStyle, extra]}
    />
  );

  const cardW = width - spacing.md * 2;
  const statW = (cardW - 24) / 3;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} scrollEnabled={false}>

        {bone('45%', 28, { marginLeft: spacing.sm, marginBottom: spacing.sm })}

        <View style={[sharedStyles.card, { backgroundColor: colors.surface, padding: spacing.md, alignItems: 'center', gap: 12 }]}>
          {bone(120, 52)}
          {bone(160, 13)}
        </View>

        <View style={skelStyles.statRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[sharedStyles.card, skelStyles.statCard, { backgroundColor: colors.surface, width: statW }]}>
              {bone(44, 26)}
              {bone(56, 11, { marginTop: 4 })}
            </View>
          ))}
        </View>

        <View style={[sharedStyles.card, styles.chartCard, { backgroundColor: colors.surface }]}>
          {bone('100%', 240)}
        </View>

        {bone('50%', 13, skelStyles.sectionHeaderBone)}
        <View style={[sharedStyles.card, { backgroundColor: colors.surface }]}>
          {[0, 1, 2].map((i) => (
            <View key={i}>
              <View style={skelStyles.sessionRow}>
                {bone(60, 15)}
                {bone(70, 15)}
                {bone(50, 15)}
              </View>
              {i < 2 && <View style={[skelStyles.hairline, { backgroundColor: colors.separator }]} />}
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const skelStyles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { borderRadius: 12, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'flex-start' },
  sectionHeaderBone: { marginLeft: spacing.sm, marginBottom: 8 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});

export default function DashboardScreen() {
  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const lastFetchedAt = useRef<number>(0);
  const hasDataRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics('refresh');
    }, [])
  );

  async function loadAnalytics(mode: 'initial' | 'refresh' | 'force' = 'initial') {
    const now = Date.now();
    if (mode === 'refresh' && lastFetchedAt.current > 0 && now - lastFetchedAt.current < 30_000) {
      return;
    }

    if (!hasDataRef.current) {
      const cached = await loadCache();
      if (cached) {
        setAnalytics(cached.analytics);
        setSessions(cached.sessions);
        setCachedAt(cached.savedAt);
        setState('ready');
        hasDataRef.current = true;
      }
    }

    if (!hasDataRef.current) {
      setState('loading');
    } else if (mode === 'force') {
      setState('refreshing');
    }

    const userId = await sessionService.getUserId();
    if (userId === null) {
      if (!hasDataRef.current) {
        setErrorMessage('Could not identify user. Try restarting the app.');
        setState('error');
      }
      return;
    }

    try {
      const [data, sessionList] = await Promise.all([
        analyticsApi.getDashboardAnalytics(userId),
        getSessions(userId),
      ]);

      lastFetchedAt.current = Date.now();
      setAnalytics(data);
      setSessions(sessionList.slice(0, 10));
      setCachedAt(null);
      setState('ready');
      hasDataRef.current = true;
      void saveCache({ analytics: data, sessions: sessionList.slice(0, 10), savedAt: Date.now() });
    } catch (error) {
      if (!hasDataRef.current) {
        setErrorMessage(
          error instanceof OfflineError
            ? 'No data available. Connect to the internet to load your stats.'
            : (error instanceof Error ? error.message : 'Failed to load dashboard data'),
        );
        setState('error');
      } else if (mode === 'force') {
        setState('ready');
      }
    }
  }

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: () => '#007AFF',
      labelColor: (opacity = 1) =>
        isDarkMode
          ? `rgba(255, 255, 255, ${opacity})`
          : `rgba(0, 0, 0, ${opacity})`,
      propsForLabels: { fontSize: 11 },
      propsForBackgroundLines: { stroke: 'rgba(0, 0, 0, 0.06)' },
      style: { borderRadius: 12 },
    }),
    [colors.surface, isDarkMode]
  );

  if (state === 'loading' && !analytics) {
    return <DashboardSkeleton />;
  }

  if (state === 'error' && !analytics) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ErrorState message={errorMessage} onRetry={() => void loadAnalytics()} />
        </View>
      </SafeAreaView>
    );
  }

  const summary = analytics!.summary;
  const dailyActivity = analytics!.dailyActivity;

  const storageChartData = {
    labels: dailyActivity.map((item) => item.label),
    datasets: [{ data: dailyActivity.map((item) => item.storageMB) }],
  };

  const allChartZero = dailyActivity.length === 0 || dailyActivity.every((d) => d.storageMB === 0);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={state === 'refreshing'}
            onRefresh={() => void loadAnalytics('force')}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Dashboard</Text>

        {/* Section 1: Hero */}
        <View style={[sharedStyles.card, styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.heroValue, { color: colors.text }]}>
            {formatFileSize(summary.storageSavedBytes) || '0 B'}
          </Text>
          <Text style={styles.heroLabel}>Total storage freed</Text>
        </View>

        {cachedAt !== null && (
          <Text style={styles.staleNote}>Last updated {formatAge(cachedAt)}</Text>
        )}

        {/* Section 2: Stats row */}
        <View style={styles.statRow}>
          {[
            { label: 'Reviewed', value: summary.reviewed, color: '#007AFF' },
            { label: 'Deleted', value: summary.deleted, color: '#FF3B30' },
            { label: 'Kept', value: summary.kept, color: '#34C759' },
          ].map(({ label, value, color }) => (
            <View key={label} style={[sharedStyles.card, styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Section 3: Chart */}
        <View style={[sharedStyles.card, styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Storage Freed</Text>
            <Text style={styles.chartSubtitle}>Last 7 days</Text>
          </View>
          {allChartZero ? (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>
                No data yet. Start swiping to see your stats.
              </Text>
            </View>
          ) : (
            <BarChart
              data={storageChartData}
              width={width - spacing.md * 4}
              height={200}
              fromZero
              segments={4}
              chartConfig={{
                ...chartConfig,
                fillShadowGradientOpacity: 1,
                barPercentage: 0.6,
              }}
              showValuesOnTopOfBars={false}
              withInnerLines={true}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" MB"
              verticalLabelRotation={0}
            />
          )}
        </View>

        {/* Section 4: Session History */}
        <Text style={styles.sectionHeader}>Recent Sessions</Text>
        <View style={[sharedStyles.card, { backgroundColor: colors.surface }]}>
          {sessions.length === 0 ? (
            <View style={styles.sessionEmpty}>
              <Text style={styles.sessionEmptyText}>No sessions yet</Text>
            </View>
          ) : (
            sessions.map((session, index) => (
              <View key={session.id}>
                <View style={styles.sessionRow}>
                  <Text style={[styles.sessionDate, { color: colors.text }]}>
                    {formatDate(session.started_at)}
                  </Text>
                  <Text style={styles.sessionDetail}>
                    {session.total_reviewed} reviewed · {session.total_deleted} deleted · {formatFileSize(session.storage_saved_bytes) || '0 B'} freed
                  </Text>
                </View>
                {index < sessions.length - 1 && (
                  <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
                )}
              </View>
            ))
          )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: spacing.sm,
  },
  staleNote: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  heroLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  chartCard: {
    padding: spacing.md,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  chart: {
    borderRadius: 8,
    marginLeft: -spacing.sm,
  },
  chartEmpty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  chartEmptyText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -spacing.sm,
  },
  sessionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 3,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDetail: {
    fontSize: 12,
    color: '#8E8E93',
  },
  sessionEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sessionEmptyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
});
