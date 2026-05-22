import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSwipeStore } from '../store/swipeStore';
import { requestPermission, loadPhotoBatch } from '../services/gallery';
import { sessionService } from '../services/sessionService';
import SwipeCard from '../components/SwipeCard';
import DeleteReviewScreen from './DeleteReviewScreen';

const GalleryScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [showReview, setShowReview] = useState(false);

  const currentPhoto = useSwipeStore((state) => state.getCurrentPhoto());
  const currentIndex = useSwipeStore((state) => state.currentIndex);
  const photos = useSwipeStore((state) => state.photos);
  const swipedPhotos = useSwipeStore((state) => state.swipedPhotos);
  const deleteQueue = useSwipeStore((state) => state.deleteQueue);
  const initializePhotos = useSwipeStore((state) => state.initializePhotos);
  const swipePhoto = useSwipeStore((state) => state.swipePhoto);
  const undoSwipe = useSwipeStore((state) => state.undoSwipe);
  const setSessionId = useSwipeStore((state) => state.setSessionId);

  // Initial load
  useEffect(() => {
    const initializeGallery = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const granted = await requestPermission();
        setPermissionGranted(granted);

        if (!granted) {
          setError('Photo library access denied. Please enable permissions in settings.');
          setIsLoading(false);
          return;
        }

        const sessionId = await sessionService.initializeSession();
        setSessionId(sessionId);

        // Load first batch (100 photos)
        const { photos: loadedPhotos, nextCursor: cursor } = await loadPhotoBatch();

        if (loadedPhotos.length === 0) {
          setError('No photos found in your library.');
          setIsLoading(false);
          return;
        }

        initializePhotos(loadedPhotos);
        setNextCursor(cursor);
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeGallery();
  }, []);

  // Load more photos when getting close to the end of current list
  useEffect(() => {
    const loadMore = async () => {
      if (!nextCursor || isLoadingMore || currentIndex < photos.length - 20) {
        return;
      }

      setIsLoadingMore(true);
      try {
        const { photos: newPhotos, nextCursor: cursor } = await loadPhotoBatch(nextCursor);
        
        // Append new photos to store using addPhotos (which shuffles)
        if (newPhotos.length > 0) {
          useSwipeStore.getState().addPhotos(newPhotos);
        }
        
        setNextCursor(cursor);
      } catch (error) {
        console.error('Error loading more photos:', error);
      } finally {
        setIsLoadingMore(false);
      }
    };

    loadMore();
  }, [currentIndex, nextCursor, photos.length, isLoadingMore]);

  // Pre-load next 3 images
  useEffect(() => {
    if (currentIndex < photos.length - 1) {
      const nextPhotos = photos.slice(currentIndex + 1, currentIndex + 4);
      nextPhotos.forEach(photo => {
        Image.prefetch(photo.uri).catch(err => console.warn('Prefetch failed', err));
      });
    }
  }, [currentIndex, photos]);

  const handleSwipe = async (action: 'keep' | 'delete') => {
    const currentPhoto = useSwipeStore.getState().getCurrentPhoto();
    if (!currentPhoto) return;

    setSyncing(true);
    try {
      await sessionService.recordSwipe(currentPhoto.id, action);
      swipePhoto(action);
    } catch (error) {
      console.error('Error during swipe:', error);
      // Still update UI
      swipePhoto(action);
    } finally {
      setSyncing(false);
    }
  };

  const handleKeep = () => handleSwipe('keep');
  const handleDelete = () => handleSwipe('delete');

  const handleUndo = async () => {
    setSyncing(true);
    try {
      await sessionService.undoSwipe();
      undoSwipe();
    } catch (error) {
      console.error('Error during undo:', error);
      undoSwipe();
    } finally {
      setSyncing(false);
    }
  };

  const hasMorePhotos = currentIndex < photos.length;
  const photosRemaining = Math.max(0, photos.length - currentIndex);
  const totalPhotos = photos.length;

  if (showReview) {
    return (
      <DeleteReviewScreen 
        onCancel={() => setShowReview(false)} 
        onConfirm={() => setShowReview(false)} 
      />
    );
  }

  if (error && !permissionGranted) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Permission Required</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <SwipeCard photo={null} onSwipe={handleKeep} isLoading={true} />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (!hasMorePhotos) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.completedContainer}>
            <Text style={styles.completedTitle}>All Done!</Text>
            <Text style={styles.completedText}>
              You've reviewed all {totalPhotos} photos
            </Text>
            {deleteQueue.length > 0 ? (
              <View style={styles.completedActions}>
                <Text style={styles.deleteQueueInfo}>
                  {deleteQueue.length} photo{deleteQueue.length === 1 ? '' : 's'} ready for deletion
                </Text>
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => setShowReview(true)}
                >
                  <Text style={styles.reviewButtonText}>Review and Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => {
                  // Reset or back to start logic could go here
                }}
              >
                <Text style={styles.reviewButtonText}>Back to Start</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>PhotoSwipe</Text>
            {deleteQueue.length > 0 && (
              <TouchableOpacity 
                style={styles.reviewHeaderButton}
                onPress={() => setShowReview(true)}
              >
                <Text style={styles.reviewHeaderText}>Review ({deleteQueue.length})</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.progress}>
            {currentIndex + 1} of {totalPhotos}
          </Text>
        </View>

        {/* Swipe Card Stack */}
        <View style={styles.photoContainer}>
          {currentIndex + 1 < photos.length && (
            <View style={StyleSheet.absoluteFill}>
              <SwipeCard 
                photo={photos[currentIndex + 1]} 
                onSwipe={() => {}} 
                isLoading={false} 
                isBackground={true} 
              />
            </View>
          )}
          <SwipeCard 
            photo={currentPhoto} 
            onSwipe={handleSwipe} 
            isLoading={false} 
          />
        </View>

        {/* Info Bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Deleted</Text>
            <Text style={styles.infoValue}>{deleteQueue.length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Reviewed</Text>
            <Text style={styles.infoValue}>{swipedPhotos.size}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Remaining</Text>
            <Text style={styles.infoValue}>{photosRemaining}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.undoButton, (currentIndex === 0 || syncing) && styles.disabledButton]}
            onPress={handleUndo}
            disabled={currentIndex === 0 || syncing}
          >
            <Text style={styles.buttonText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton, syncing && styles.disabledButton]}
            onPress={handleDelete}
            disabled={syncing}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.keepButton, syncing && styles.disabledButton]}
            onPress={handleKeep}
            disabled={syncing}
          >
            <Text style={styles.buttonText}>Keep</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  reviewHeaderButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reviewHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progress: {
    fontSize: 14,
    color: '#999999',
  },
  photoContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  completedText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  completedActions: {
    alignItems: 'center',
  },
  deleteQueueInfo: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: 16,
  },
  reviewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  reviewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  keepButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default GalleryScreen;
 fontWeight: '600',
    marginBottom: 16,
  },
  reviewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  reviewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  keepButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default GalleryScreen;
