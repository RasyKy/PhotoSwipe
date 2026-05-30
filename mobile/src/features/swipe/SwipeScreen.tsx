import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AppTabParamList } from '../../navigation/AppNavigator';
import { useSettingsStore } from '../../stores/settingsStore';
import api from '../../services/api';
import { getTotalPhotoCount, loadPhotoBatch, refreshPhotoSizes, requestPermission } from '../../services/gallery';
import { sessionService } from '../../services/sessionService';
import { useSwipeStore } from '../../store/swipeStore';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import DeleteReviewScreen from '../delete/DeleteReviewScreen';
import SwipeCard from './SwipeCard';

type PendingSwipeItem = {
  photoUri: string;
  photoName: string;
  fileSizeBytes: number;
  action: 'keep' | 'delete';
};

export default function SwipeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const hapticEnabled = useSettingsStore((state) => state.hapticEnabled);
  const progressFill = useSharedValue(0);

  const [isLoading, setIsLoading] = useState(true);
  const [permissionCanRetry, setPermissionCanRetry] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const photos = useSwipeStore((state) => state.photos);
  const currentIndex = useSwipeStore((state) => state.currentIndex);
  const deleteQueue = useSwipeStore((state) => state.deleteQueue);
  const totalPhotoCount = useSwipeStore((state) => state.totalPhotoCount);
  const initializePhotos = useSwipeStore((state) => state.initializePhotos);
  const swipePhoto = useSwipeStore((state) => state.swipePhoto);
  const undoSwipe = useSwipeStore((state) => state.undoSwipe);
  const setSessionId = useSwipeStore((state) => state.setSessionId);
  const setTotalPhotoCount = useSwipeStore((state) => state.setTotalPhotoCount);
  const updatePhotoSizes = useSwipeStore((state) => state.updatePhotoSizes);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingSwipesRef = useRef<PendingSwipeItem[]>([]);
  const isFlushingRef = useRef(false);

  useEffect(() => {
    const run = () => initGallery();

    if (useSwipeStore.persist.hasHydrated()) {
      run();
    } else {
      const unsub = useSwipeStore.persist.onFinishHydration(run);
      return unsub;
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'active' && (prev === 'background' || prev === 'inactive')) {
        if (permissionCanRetry !== null) {
          void (async () => {
            const result = await requestPermission();
            if (result.granted) {
              setError(null);
              setPermissionCanRetry(null);
              setIsLoading(true);
              await initGallery();
            }
          })();
        }
      }
    });

    return () => subscription.remove();
  }, [permissionCanRetry]);

  const initGallery = async () => {
    const result = await requestPermission();

    if (!result.granted) {
      setPermissionCanRetry(result.canRetry);
      setError(
        result.canRetry
          ? 'Photo library access is required to use PhotoSwipe.'
          : 'Please enable Photos permission in Settings to use PhotoSwipe.',
      );
      setIsLoading(false);
      return;
    }

    setPermissionCanRetry(null);

    const total = await getTotalPhotoCount();
    setTotalPhotoCount(total);

    const { sessionId: storedSessionId, photos: storedPhotos } =
      useSwipeStore.getState();

    if (storedSessionId !== null && storedPhotos.length > 0) {
      const sessionId = await sessionService.initializeSession();
      setSessionId(sessionId);
      setIsLoading(false);
      refreshPhotoSizes(storedPhotos)
        .then((refreshed) => updatePhotoSizes(refreshed))
        .catch(() => {});
      return;
    }

    try {
      const sessionId = await sessionService.initializeSession();
      setSessionId(sessionId);

      const { photos: batch, nextCursor: cursor } = await loadPhotoBatch();
      if (batch.length === 0) {
        setError('No photos found in your library.');
        setIsLoading(false);
        return;
      }

      initializePhotos(batch);
      setNextCursor(cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!nextCursor || isLoadingMore || currentIndex < photos.length - 20) return;

    setIsLoadingMore(true);
    loadPhotoBatch(nextCursor)
      .then(({ photos: batch, nextCursor: cursor }) => {
        if (batch.length > 0) useSwipeStore.getState().addPhotos(batch);
        setNextCursor(cursor);
      })
      .catch((err) => console.error('Failed to load more photos:', err))
      .finally(() => setIsLoadingMore(false));
  }, [currentIndex, photos.length, nextCursor, isLoadingMore]);

  useEffect(() => {
    photos
      .slice(currentIndex + 1, currentIndex + 4)
      .forEach((p) => Image.prefetch(p.uri).catch(() => {}));
  }, [currentIndex, photos]);

  const flushPendingSwipes = useCallback(async () => {
    if (pendingSwipesRef.current.length === 0 || isFlushingRef.current) return;
    isFlushingRef.current = true;
    const batch = pendingSwipesRef.current.splice(0);
    const sessionId = sessionService.getSessionId() ?? '';
    if (!sessionId) {
      isFlushingRef.current = false;
      return;
    }
    try {
      await api.recordSwipeBatch(sessionId, batch);
    } catch (err) {
      console.error('Batch swipe sync failed:', err);
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => { void flushPendingSwipes(); }, 2000);
    return () => {
      clearInterval(id);
      void flushPendingSwipes();
    };
  }, [flushPendingSwipes]);

  useEffect(() => {
    const barWidth = screenWidth - 32;
    const t = totalPhotoCount > 0 ? totalPhotoCount : photos.length;
    progressFill.value = withTiming(
      t > 0 ? (currentIndex / t) * barWidth : 0,
      { duration: 300 },
    );
  }, [currentIndex, totalPhotoCount, photos.length, screenWidth]);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: progressFill.value,
  }));

  const handleSwipe = useCallback(
    (action: 'keep' | 'delete') => {
      const photo = useSwipeStore.getState().getCurrentPhoto();
      if (!photo) return;
      swipePhoto(action);
      if (hapticEnabled) {
        Haptics.impactAsync(
          action === 'keep'
            ? Haptics.ImpactFeedbackStyle.Light
            : Haptics.ImpactFeedbackStyle.Medium,
        ).catch(() => {});
      }
      pendingSwipesRef.current.push({
        photoUri: photo.uri,
        photoName: photo.filename,
        fileSizeBytes: photo.fileSize,
        action,
      });
    },
    [swipePhoto, hapticEnabled],
  );

  const handleUndo = useCallback(() => {
    undoSwipe();
    if (pendingSwipesRef.current.length > 0) {
      // Swipe is still queued and not yet sent — remove it without touching the API
      pendingSwipesRef.current.pop();
    } else {
      // Swipe was already batch-flushed — tell the backend to undo its last recorded swipe
      const sessionId = sessionService.getSessionId() ?? '';
      if (sessionId) {
        api.undoSwipe(sessionId).catch((err) => {
          console.error('Undo sync failed:', err);
        });
      }
    }
  }, [undoSwipe]);

  const handleStartNewSession = async () => {
    await flushPendingSwipes();
    useSwipeStore.getState().reset();
    setIsLoading(true);
    setError(null);
    setNextCursor(undefined);
    setIsLoadingMore(false);
    setShowReview(false);
    await initGallery();
  };

  const currentPhoto = photos[currentIndex] ?? null;
  const nextPhoto = photos[currentIndex + 1] ?? undefined;
  const hasMore = nextCursor !== undefined;
  const isDone = !isLoading && !isLoadingMore && photos.length > 0 && currentIndex >= photos.length && !hasMore;
  const undoDisabled = currentIndex === 0;
  const total = totalPhotoCount > 0 ? totalPhotoCount : photos.length;

  if (showReview) {
    return (
      <GestureHandlerRootView style={styles.fill}>
        <DeleteReviewScreen onDismiss={() => setShowReview(false)} />
      </GestureHandlerRootView>
    );
  }

  if (isLoading) {
    return (
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.footnote, styles.hint, { color: colors.textSecondary }]}>
            Loading your photos...
          </Text>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (error) {
    const isPermissionError = permissionCanRetry !== null;
    return (
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[typography.title3, styles.errorTitle, { color: colors.text }]}>
            {isPermissionError ? 'Permission Required' : 'Something went wrong'}
          </Text>
          <Text style={[typography.subheadline, styles.errorBody, { color: colors.textSecondary }]}>
            {error}
          </Text>
          {isPermissionError && permissionCanRetry ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setError(null);
                setPermissionCanRetry(null);
                setIsLoading(true);
                void initGallery();
              }}
            >
              <Text style={styles.primaryBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          ) : isPermissionError && !permissionCanRetry ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => void Linking.openSettings()}
            >
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setError(null);
                setIsLoading(true);
                void initGallery();
              }}
            >
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (isDone) {
    return (
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centered, { backgroundColor: colors.background }]}>
          <View style={styles.doneContent}>
            <Text style={[styles.doneTitle, { color: colors.text }]}>All done!</Text>
            <Text style={styles.doneSubtitle}>
              You reviewed all {total} photo{total === 1 ? '' : 's'}.
            </Text>
            {deleteQueue.length > 0 && (
              <Text style={styles.queueNote}>
                {deleteQueue.length} photo{deleteQueue.length === 1 ? '' : 's'} queued for deletion
              </Text>
            )}
            {deleteQueue.length > 0 && (
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={async () => {
                  await flushPendingSwipes();
                  navigation.navigate('Delete');
                }}
              >
                <Text style={styles.reviewBtnText}>Review Delete Queue</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.newSessionBtn, { marginTop: deleteQueue.length > 0 ? 12 : 24 }]}
              onPress={handleStartNewSession}
            >
              <Text style={styles.newSessionBtnText}>Start New Session</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (!currentPhoto) {
    return (
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.footnote, styles.hint, { color: colors.textSecondary }]}>
            Loading more photos...
          </Text>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[typography.title2, { color: colors.text }]}>PhotoSwipe</Text>
            <View style={styles.progressLine}>
              <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                {currentIndex} of {total} reviewed
              </Text>
              {isLoadingMore && (
                <ActivityIndicator size="small" color={colors.textSecondary} style={styles.loadingSpinner} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFillBar, progressFillStyle]} />
        </View>

        <View style={styles.cardArea}>
          <SwipeCard
            key={currentPhoto.id}
            photo={currentPhoto}
            nextPhoto={nextPhoto}
            onSwipeLeft={() => handleSwipe('delete')}
            onSwipeRight={() => handleSwipe('keep')}
          />
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.btnDelete} onPress={() => handleSwipe('delete')}>
            <Ionicons name="close" size={28} color="#FF3B30" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnUndo, undoDisabled && styles.btnDisabled]}
            onPress={handleUndo}
            disabled={undoDisabled}
          >
            <Ionicons name="arrow-undo" size={22} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnKeep} onPress={() => handleSwipe('keep')}>
            <Ionicons name="checkmark" size={28} color="#34C759" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerText: {
    gap: 2,
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingSpinner: {
    marginLeft: 2,
  },
  progressTrack: {
    marginHorizontal: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 8,
  },
  progressFillBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#007AFF',
  },
  cardArea: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 0,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  btnDelete: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  btnUndo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  btnKeep: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 10,
  },
  errorBody: {
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hint: {
    marginTop: 12,
    textAlign: 'center',
  },
  doneContent: {
    width: '100%',
    alignItems: 'center',
  },
  doneTitle: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  doneSubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  queueNote: {
    fontSize: 15,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
  },
  reviewBtn: {
    backgroundColor: '#1C1C1E',
    height: 52,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newSessionBtn: {
    backgroundColor: '#F2F2F7',
    height: 52,
    borderRadius: 12,
    marginHorizontal: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSessionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
