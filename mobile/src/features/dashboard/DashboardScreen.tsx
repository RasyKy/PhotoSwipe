import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { EmptyState, ErrorState, LoadingSpinner, StatCard } from '../../components';
import { analyticsApi, DashboardAnalytics } from '../../services/analyticsApi';
import { formatFileSize } from '../../utils/fileSize';
import { useTheme } from '../../theme/ThemeContext';

type LoadState = 'idle' | 'loading' | 'refreshing' | 'error' | 'empty' | 'ready';

export default function DashboardScreen() {
  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadAnalytics();
  }, []);

  async function loadAnalytics(mode: 'initial' | 'refresh' = 'initial') {
    if (mode === 'refresh') {
      setState((current) => (current === 'ready' ? 'refreshing' : 'loading'));
    } else {
      setState('loading');
    }

    try {
      const data = await analyticsApi.getDashboardAnalytics();
      setAnalytics(data);

      if (
        data.summary.photosReviewed === 0 &&
        data.sessionHistory.length === 0 &&
        data.dailyActivity.length === 0
      ) {
        setState('empty');
      } else {
        setState('ready');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load dashboard data');
      setState('error');
    }
  }

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
      labelColor: (opacity = 1) => (isDarkMode ? `rgba(245, 247, 251, ${opacity})` : `rgba(18, 24, 38, ${opacity})`),
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary,
      },
      propsForLabels: {
        fontSize: 11,
      },
      style: {
        borderRadius: 18,
      },
    }),
    [colors.primary, colors.surface, isDarkMode]
  );

  if (state === 'loading' && !analytics) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading dashboard..." />
      </View>
    );
  }

  if (state === 'error' && !analytics) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ErrorState message={errorMessage} onRetry={() => void loadAnalytics()} />
      </View>
    );
  }

  if (state === 'empty' && analytics) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <EmptyState
          title="No analytics yet"
          description="Start a few swipe sessions and the dashboard will populate automatically."
          buttonLabel="Refresh"
          onButtonPress={() => void loadAnalytics('refresh')}
        />
      </View>
    );
  }

  if (!analytics) {
    return null;
  }

  const summaryCards = [
    { label: 'Photos Reviewed', value: analytics.summary.photosReviewed },
    { label: 'Kept', value: analytics.summary.kept, accentColor: colors.success },
    { label: 'Deleted', value: analytics.summary.deleted, accentColor: colors.danger },
    { label: 'Storage Saved', value: formatFileSize(analytics.summary.storageSavedBytes), accentColor: colors.warning },
    { label: 'Sessions', value: analytics.summary.sessions, accentColor: colors.primary },
  ];

  const barChartData = {
    labels: analytics.dailyActivity.map((item) => item.label),
    datasets: [
      {
        data: analytics.dailyActivity.map((item) => item.kept),
      },
      {
        data: analytics.dailyActivity.map((item) => item.deleted),
      },
    ],
    legend: ['Kept', 'Deleted'],
  };

  const lineChartData = {
    labels: analytics.cumulativeStorage.map((item) => item.label),
    datasets: [
      {
        data: analytics.cumulativeStorage.map((item) => item.storageSavedBytes / (1024 * 1024)),
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const pieData = [
    {
      name: 'Kept',
      population: analytics.summary.kept,
      color: colors.success,
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    },
    {
      name: 'Deleted',
      population: analytics.summary.deleted,
      color: colors.danger,
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={state === 'refreshing'} onRefresh={() => void loadAnalytics('refresh')} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Session analytics and storage impact at a glance</Text>

      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <View key={card.label} style={styles.summaryCardWrap}>
            <StatCard value={card.value} label={card.label} accentColor={card.accentColor} />
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Kept vs Deleted</Text>
        <BarChart
          data={barChartData}
          width={width - 40}
          height={260}
          fromZero
          chartConfig={{
            ...chartConfig,
            fillShadowGradientOpacity: 0.9,
            barPercentage: 0.6,
          }}
          showValuesOnTopOfBars={false}
          withInnerLines={false}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          verticalLabelRotation={0}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cumulative Storage Saved</Text>
        <LineChart
          data={lineChartData}
          width={width - 40}
          height={260}
          chartConfig={{
            ...chartConfig,
            fillShadowGradientOpacity: 0.12,
          }}
          bezier
          style={styles.chart}
          withDots
          withShadow={false}
          withInnerLines={false}
          withOuterLines={false}
          fromZero={false}
          yAxisSuffix=" MB"
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Keep / Delete Ratio</Text>
        <PieChart
          data={pieData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="16"
          center={[0, 0]}
          absolute
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Session History</Text>

        {analytics.sessionHistory.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Your past sessions will appear here after you start swiping photos."
          />
        ) : (
          <FlatList
            data={analytics.sessionHistory}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            renderItem={({ item }) => (
              <View style={styles.sessionRow}>
                <View style={styles.sessionHeader}>
                  <Text style={[styles.sessionTitle, { color: colors.text }]}>Session {item.id.replace('session-', '')}</Text>
                  <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>{new Date(item.startedAt).toLocaleDateString()}</Text>
                </View>

                <View style={styles.sessionStats}>
                  <Text style={[styles.sessionStat, { color: colors.textSecondary }]}>{item.photosReviewed} reviewed</Text>
                  <Text style={[styles.sessionStat, { color: colors.success }]}>{item.kept} kept</Text>
                  <Text style={[styles.sessionStat, { color: colors.danger }]}>{item.deleted} deleted</Text>
                  <Text style={[styles.sessionStat, { color: colors.warning }]}>{formatFileSize(item.storageSavedBytes)} saved</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCardWrap: {
    width: '48%',
  },
  section: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  chart: {
    borderRadius: 18,
    marginLeft: -10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  sessionRow: {
    gap: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sessionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionStat: {
    fontSize: 12,
    fontWeight: '600',
  },
});import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
});
