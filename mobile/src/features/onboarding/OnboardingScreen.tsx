import React, { useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';

const ONBOARDING_KEY = 'photoswipe_onboarded';

interface Props {
  onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const [page, setPage] = useState(0);

  const pages = [
    {
      title: 'Welcome to PhotoSwipe',
      body: 'Quickly review and clean up your photo library.',
    },
    {
      title: 'Keep what matters',
      body: 'Swipe to keep or delete. We show useful stats and recovery options.',
    },
    {
      title: 'Start saving space',
      body: 'Delete unwanted photos and free storage on your device.',
    },
  ];

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    onComplete?.();
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    onComplete?.();
  };

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = Dimensions.get('window').width;
    const newPage = Math.round(x / w);
    setPage(newPage);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={(r) => { scrollRef.current = r; }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {pages.map((p, i) => (
          <View key={p.title} style={[styles.page, { width: Dimensions.get('window').width }]}> 
            <View style={styles.artPlaceholder}>
              <Text style={[styles.artEmoji, { color: colors.primary }]}>📸</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{p.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{p.body}</Text>

            <View style={styles.pageFooter}>
              {i < pages.length - 1 ? (
                <Pressable onPress={handleSkip} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={[styles.skipText, { color: colors.primary }]}>Skip</Text>
                </Pressable>
              ) : (
                <Pressable onPress={handleGetStarted} style={({ pressed }) => [styles.getStartedButton, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}>
                  <Text style={styles.getStartedText}>Get Started</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {pages.map((_, i) => (
          <View key={i} style={[styles.dot, { opacity: i === page ? 1 : 0.3, backgroundColor: colors.primary }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  artPlaceholder: { width: 160, height: 160, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  artEmoji: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 15, textAlign: 'center', maxWidth: 520 },
  pageFooter: { position: 'absolute', bottom: 48, left: 24, right: 24, alignItems: 'center' },
  skipText: { fontSize: 16, fontWeight: '700' },
  getStartedButton: { minWidth: 200, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  getStartedText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pagination: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 10, marginHorizontal: 6 },
});
