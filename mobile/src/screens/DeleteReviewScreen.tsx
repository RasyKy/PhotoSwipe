import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSwipeStore } from '../store/swipeStore';
import { formatFileSize, getFileSize } from '../utils/fileSize';
import { deleteService, DeleteProgress } from '../services/deleteService';
import DeleteSuccessScreen from './DeleteSuccessScreen';

interface PhotoWithSize {
  photoId: string;
  uri: string;
  size: number;
}

const DeleteReviewScreen: React.FC<{ onConfirm?: () => void; onCancel?: () => void }> = ({
  onConfirm,
  onCancel,
}) => {
  const deleteQueue = useSwipeStore((state) => state.deleteQueue);
  const removeFromDeleteQueue = useSwipeStore((state) => state.removeFromDeleteQueue);

  const [photosWithSizes, setPhotosWithSizes] = useState<PhotoWithSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress | null>(null);
  const [deleteResult, setDeleteResult] = useState<{ deletedCount: number; freedStorage: number; failedCount: number } | null>(null);
  const clearDeleteQueue = useSwipeStore((state) => state.clearDeleteQueue);

  // Fetch file sizes for all photos in delete queue
  useEffect(() => {
    const fetchSizes = async () => {
      // Don't show global loading if we already have some data
      if (photosWithSizes.length === 0) {
        setLoading(true);
      }
      
      try {
        const photosData: PhotoWithSize[] = await Promise.all(
          deleteQueue.map(async (item) => {
            // Check if we already have the size for this photo in current state
            const existing = photosWithSizes.find(p => p.photoId === item.photoId);
            if (existing && existing.size > 0) {
              return existing;
            }

            let size = item.size;

            // If size is 0, try to fetch it
            if (size === 0) {
              size = await getFileSize(item.uri);
            }

            return {
              photoId: item.photoId,
              uri: item.uri,
              size,
            };
          })
        );

        setPhotosWithSizes(photosData);
      } catch (error) {
        console.error('Error fetching file sizes:', error);
        // Fallback: use sizes as-is
        setPhotosWithSizes(
          deleteQueue.map((item) => ({
            photoId: item.photoId,
            uri: item.uri,
            size: item.size,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    if (deleteQueue.length > 0) {
      fetchSizes();
    } else {
      setPhotosWithSizes([]);
      setLoading(false);
    }
  }, [deleteQueue]);

  const totalSize = photosWithSizes.reduce((sum, photo) => sum + photo.size, 0);

  const handleRemovePhoto = (photoId: string) => {
    removeFromDeleteQueue(photoId);
  };

  const handleConfirmDelete = () => {
    if (photosWithSizes.length === 0) {
      Alert.alert('No Photos', 'No photos to delete.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Delete ${photosWithSizes.length} photo${photosWithSizes.length === 1 ? '' : 's'} and free up ${formatFileSize(totalSize)}?`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => performDelete(),
          style: 'destructive',
        },
      ]
    );
  };

  const performDelete = async () => {
    setDeleting(true);
    setConfirming(true);

    try {
      const photoIds = photosWithSizes.map((p) => p.photoId);

      // Perform deletion with progress tracking
      const result = await deleteService.deletePhotos(
        photoIds,
        deleteQueue,
        (progress) => {
          setDeleteProgress(progress);
        }
      );

      // Calculate freed storage
      const freedStorage = photosWithSizes
        .filter((p) => photoIds.includes(p.photoId))
        .reduce((sum, p) => sum + p.size, 0);

      // Show success screen
      setDeleteResult({
        deletedCount: result.deletedCount,
        freedStorage,
        failedCount: result.failedCount,
      });

      // Clear store
      clearDeleteQueue();
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete photos. Please try again.');
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const renderPhotoItem = ({ item }: { item: PhotoWithSize }) => (
    <View style={styles.photoGridItem}>
      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemovePhoto(item.photoId)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
      <View style={styles.sizeLabel}>
        <Text style={styles.sizeText}>{formatFileSize(item.size)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Calculating sizes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show success screen after deletion
  if (deleteResult) {
    return (
      <DeleteSuccessScreen
        deletedCount={deleteResult.deletedCount}
        freedStorage={deleteResult.freedStorage}
        failedCount={deleteResult.failedCount}
        onContinue={onCancel || (() => {})}
      />
    );
  }

  // Show progress screen during deletion
  if (deleting && deleteProgress) {
    const progress = deleteProgress.completed / deleteProgress.total;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressTitle}>Deleting Photos...</Text>

            {/* Progress Bar */}
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(100, Math.round(progress * 100))}%` },
                ]}
              />
            </View>

            {/* Progress Text */}
            <Text style={styles.progressText}>
              {deleteProgress.completed} of {deleteProgress.total}
            </Text>

            {/* Activity Indicator */}
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />

            {deleteProgress.error && (
              <Text style={styles.errorText}>{deleteProgress.error}</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (deleteQueue.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Delete Review</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelHeaderButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No photos to delete</Text>
          <TouchableOpacity style={styles.backButton} onPress={onCancel}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delete Review</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelHeaderButton}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Storage Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Photos to Delete</Text>
          <Text style={styles.summaryValue}>{photosWithSizes.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Storage to Free</Text>
          <Text style={styles.summaryValueLarge}>{formatFileSize(totalSize)}</Text>
        </View>
      </View>

      {/* Photo Grid */}
      <FlatList
        data={photosWithSizes}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.photoId}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        scrollEnabled={true}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={confirming}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.confirmButton, confirming && styles.buttonDisabled]}
          onPress={handleConfirmDelete}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.confirmButtonText}>Delete {photosWithSizes.length}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#eeeeee',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 12,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  cancelHeaderButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  summaryItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryValueLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#dddddd',
    marginHorizontal: 12,
  },
  gridContainer: {
    paddingHorizontal: 8,
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  photoGridItem: {
    width: '31%',
    aspectRatio: 1,
    marginBottom: 8,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sizeLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
  },
  sizeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
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
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeleteReviewScreen;
