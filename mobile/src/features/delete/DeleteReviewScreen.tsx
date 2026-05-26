import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteService, DeleteProgress } from '../../services/deleteService';
import { useSwipeStore } from '../../store/swipeStore';
import { DeleteQueueItem } from '../../types/index';
import { formatFileSize } from '../../utils/fileSize';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_MARGIN = 2;
const ITEM_SIZE = (SCREEN_WIDTH - ITEM_MARGIN * (NUM_COLUMNS + 1) * 2) / NUM_COLUMNS;

interface GridItem extends DeleteQueueItem {
  filename: string;
}

interface DeleteReviewScreenProps {
  onDismiss?: () => void;
}

export default function DeleteReviewScreen({ onDismiss }: DeleteReviewScreenProps) {
  const deleteQueue = useSwipeStore((state) => state.deleteQueue);
  const photos = useSwipeStore((state) => state.photos);
  const removeFromDeleteQueue = useSwipeStore((state) => state.removeFromDeleteQueue);
  const clearDeleteQueue = useSwipeStore((state) => state.clearDeleteQueue);

  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<DeleteProgress | null>(null);

  const filenameMap = useMemo(
    () => new Map(photos.map((p) => [p.id, p.filename])),
    [photos],
  );

  const gridItems: GridItem[] = useMemo(
    () =>
      deleteQueue.map((item) => ({
        ...item,
        filename:
          filenameMap.get(item.photoId) ?? item.uri.split('/').pop() ?? 'photo',
      })),
    [deleteQueue, filenameMap],
  );

  const totalSize = useMemo(
    () => gridItems.reduce((sum, item) => sum + item.size, 0),
    [gridItems],
  );

  const handleTapItem = (item: GridItem) => {
    Alert.alert(
      'Remove from Queue',
      `Remove "${item.filename}" from the delete list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromDeleteQueue(item.photoId),
        },
      ],
    );
  };

  const handleConfirmDelete = () => {
    if (gridItems.length === 0) return;
    Alert.alert(
      'Delete Photos',
      `Permanently delete ${gridItems.length} photo${gridItems.length === 1 ? '' : 's'} and free ${formatFileSize(totalSize)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ],
    );
  };

  const performDelete = async () => {
    setIsDeleting(true);
    setProgress({ completed: 0, total: gridItems.length });

    try {
      const photoIds = gridItems.map((item) => item.photoId);
      const result = await deleteService.deletePhotos(photoIds, deleteQueue, (p) => {
        setProgress(p);
      });

      clearDeleteQueue();

      const failNote =
        result.failedCount > 0 ? ` ${result.failedCount} could not be deleted.` : '';
      Alert.alert(
        'Done',
        `Deleted ${result.deletedCount} photo${result.deletedCount === 1 ? '' : 's'} and freed ${formatFileSize(totalSize)}.${failNote}`,
      );
    } catch {
      Alert.alert('Error', 'Failed to delete photos. Please try again.');
    } finally {
      setIsDeleting(false);
      setProgress(null);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<GridItem>) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handleTapItem(item)}
      activeOpacity={0.75}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
      <View style={styles.itemInfo}>
        <Text style={styles.itemFilename} numberOfLines={1} ellipsizeMode="tail">
          {item.filename}
        </Text>
        <Text style={styles.itemSize}>{formatFileSize(item.size)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isDeleting) {
    const pct =
      progress && progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ff3b30" />
          <Text style={styles.deletingText}>Deleting photos...</Text>
          {progress && (
            <Text style={styles.progressText}>
              {progress.completed} / {progress.total} ({pct}%)
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (gridItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Delete Queue</Text>
            {onDismiss && (
              <TouchableOpacity onPress={onDismiss}>
                <Text style={styles.dismissText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Queue is empty</Text>
          <Text style={styles.emptySubtitle}>
            Swipe left on photos to add them here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Delete Queue</Text>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss}>
              <Text style={styles.dismissText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerSubtitle}>Tap a photo to remove it from the list</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{gridItems.length}</Text>
          <Text style={styles.summaryLabel}>photos selected</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, styles.summaryValueRed]}>
            {formatFileSize(totalSize)}
          </Text>
          <Text style={styles.summaryLabel}>storage to free</Text>
        </View>
      </View>

      <FlatList
        data={gridItems}
        keyExtractor={(item) => item.photoId}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleConfirmDelete}>
          <Text style={styles.deleteButtonText}>
            Delete {gridItems.length} Photo{gridItems.length === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryValueRed: {
    color: '#ff3b30',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: '#d0d0d0',
    marginHorizontal: 16,
  },
  grid: {
    padding: ITEM_MARGIN,
  },
  gridItem: {
    width: ITEM_SIZE,
    margin: ITEM_MARGIN,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
  },
  itemInfo: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  itemFilename: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333333',
  },
  itemSize: {
    fontSize: 9,
    color: '#888888',
    marginTop: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  deletingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dismissText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
