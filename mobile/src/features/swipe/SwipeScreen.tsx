import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { loadPhotoBatch, requestPermission } from '../../services/gallery';
import { sessionService } from '../../services/sessionService';
import { useSwipeStore } from '../../store/swipeStore';
import DeleteReviewScreen from '../delete/DeleteReviewScreen';
import SwipeCard from './SwipeCard';

export default function SwipeScreen() {
  // Start loading=true; stays true until after hydration check completes.
  const [isLoading, setIsLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const photos = useSwipeStore((state) => state.photos);
  const currentIndex = useSwipeStore((state) => state.currentIndex);
  const swipedPhotos = useSwipeStore((state) => state.swipedPhotos);
  const deleteQueue = useSwipeStore((state) => state.deleteQueue);
  const initializePhotos = useSwipeStore((state) => state.initializePhotos);
  const swipePhoto = useSwipeStore((state) => state.swipePhoto);
  const undoSwipe = useSwipeStore((state) => state.undoSwipe);
  const setSessionId = useSwipeStore((state) => state.setSessionId);

  // Wait for the persist middleware to finish reading from AsyncStorage before
  // deciding whether to resume or start fresh. Without this gate, initializePhotos
  // would run before the store hydrates and would always reset currentIndex to 0.
  useEffect(() => {
    const run = () => initGallery();

    if (useSwipeStore.persist.hasHydrated()) {
      run();
    } else {
      const unsub = useSwipeStore.persist.onFinishHydration(run);
      return unsub;
    }
  }, []);

  const initGallery = async () => {
    const granted = await requestPermission();
    setPermissionGranted(granted);

    if (!granted) {
      setError('Photo library access is required. Please enable it in Settings.');
      setIsLoading(false);
      return;
    }

    // Resume: store has photos and a sessionId from a previous run.
    // sessionService.initializeSession() restores its own in-memory state from
    // AsyncStorage, so the swipe-action log is also intact.
    const { sessionId: storedSessionId, photos: storedPhotos } =
      useSwipeStore.getState();

    if (storedSessionId !== null && storedPhotos.length > 0) {
      const sessionId = await sessionService.initializeSession();
      setSessionId(sessionId);
      setIsLoading(false);
      return;
    }

    // Fresh start: create session then load first batch of photos.
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

  // Load the next batch when 20 photos remain in the queue
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

  // Prefetch the next 3 photos
  useEffect(() => {
    photos
      .slice(currentIndex + 1, currentIndex + 4)
      .forEach((p) => Image.prefetch(p.uri).catch(() => {}));
  }, [currentIndex, photos]);

  // Optimistic update: advance immediately, sync to API in background
  const handleSwipe = useCallback(
    async (action: 'keep' | 'delete') => {
      const photo = useSwipeStore.getState().getCurrentPhoto();
      if (!photo) return;
      swipePhoto(action);
      try {
        await sessionService.recordSwipe(photo.id, action);
      } catch (err) {
        console.error('Swipe sync failed:', err);
      }
    },
    [swipePhoto],
  );

  const handleUndo = useCallback(async () => {
    undoSwipe();
    try {
      await sessionService.undoSwipe();
    } catch (err) {
      console.error('Undo sync failed:', err);
    }
  }, [undoSwipe]);

  const currentPhoto = photos[currentIndex] ?? null;
  const nextPhoto = photos[currentIndex + 1] ?? undefined;
  const isDone = !isLoading && photos.length > 0 && currentIndex >= photos.length;
  const remaining = Math.max(0, photos.length - currentIndex);

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
        <SafeAreaView style={[styles.fill, styles.centered]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.hint}>Loading your photos...</Text>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (error) {
    return (
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centered]}>
          <Text style={styles.errorTitle}>
            {permissionGranted ? 'Something went wrong' : 'Permission Required'}
          </Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setError(null);
              setIsLoading(true);
            }}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (isDone) {
    return (
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centered]}>
          <Text style={styles.doneTitle}>All done!</Text>
          <Text style={styles.doneSubtitle}>
            You reviewed all {photos.length} photo{photos.length === 1 ? '' : 's'}.
          </Text>
          {deleteQueue.length > 0 ? (
            <>
              <Text style={styles.queueNote}>
                {deleteQueue.length} photo{deleteQueue.length === 1 ? '' : 's'} queued for deletion
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowReview(true)}
              >
                <Text style={styles.primaryBtnText}>Review and Delete</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.hint}>All photos kept.</Text>
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (!currentPhoto) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>PhotoSwipe</Text>
          {deleteQueue.length > 0 && (
            <TouchableOpacity
              style={styles.reviewBadge}
              onPress={() => setShowReview(true)}
            >
              <Text style={styles.reviewBadgeText}>
                Review ({deleteQueue.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {photos.length}
          </Text>
          {isLoadingMore && (
            <ActivityIndicator
              size="small"
              color="#aaaaaa"
              style={styles.loadingMoreSpinner}
            />
          )}
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

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{swipedPhotos.size}</Text>
            <Text style={styles.statLabel}>Reviewed</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                deleteQueue.length > 0 && styles.statRed,
              ]}
            >
              {deleteQueue.length}
            </Text>
            <Text style={styles.statLabel}>To Delete</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{remaining}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.undoBtn,
              currentIndex === 0 && styles.actionBtnDisabled,
            ]}
            onPress={handleUndo}
            disabled={currentIndex === 0}
          >
            <Text style={[styles.actionBtnText, styles.undoBtnText]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleSwipe('delete')}
          >
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.keepBtn]}
            onPress={() => handleSwipe('keep')}
          >
            <Text style={styles.actionBtnText}>Keep</Text>
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
    backgroundColor: '#ffffff',
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reviewBadge: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  reviewBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#888888',
  },
  loadingMoreSpinner: {
    marginLeft: 8,
  },
  cardArea: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statRed: {
    color: '#ff3b30',
  },
  statLabel: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  undoBtn: {
    backgroundColor: '#e8e8e8',
  },
  undoBtnText: {
    color: '#555555',
  },
  deleteBtn: {
    backgroundColor: '#ff3b30',
  },
  keepBtn: {
    backgroundColor: '#34c759',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorBody: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  doneSubtitle: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 20,
  },
  queueNote: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
    textAlign: 'center',
  },
});
