import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionSheet, Toast, useToast } from '../../components';
import * as FileSystem from 'expo-file-system/legacy';
import { deleteService, DeleteProgress } from '../../services/deleteService';
import { useSwipeStore } from '../../store/swipeStore';
import { DeleteQueueItem } from '../../types/index';
import { formatFileSize } from '../../utils/fileSize';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_MARGIN = 2;
const ITEM_SIZE = (SCREEN_WIDTH - ITEM_MARGIN * (NUM_COLUMNS + 1) * 2) / NUM_COLUMNS;

interface DeleteReviewScreenProps {
  onDismiss?: () => void;
}

export default function DeleteReviewScreen({ onDismiss }: DeleteReviewScreenProps) {
  const { colors } = useTheme();
  const deleteQueue = useSwipeStore((state) => state.deleteQueue);
  const removeFromDeleteQueue = useSwipeStore((state) => state.removeFromDeleteQueue);
  const clearDeleteQueue = useSwipeStore((state) => state.clearDeleteQueue);

  const { showToast, toastProps } = useToast();

  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<DeleteProgress | null>(null);
  const [confirmSheetVisible, setConfirmSheetVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalSize = useMemo(
    () => deleteQueue.reduce((sum, item) => sum + item.size, 0),
    [deleteQueue],
  );


  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handlePress = (item: DeleteQueueItem) => {
    if (selectMode) {
      const next = new Set(selectedIds);
      if (next.has(item.photoId)) {
        next.delete(item.photoId);
      } else {
        next.add(item.photoId);
      }
      setSelectedIds(next);
      if (next.size === 0) {
        setSelectMode(false);
      }
    } else {
      setViewerUri(item.uri);
    }
  };

  const handleLongPress = (item: DeleteQueueItem) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([item.photoId]));
    }
  };

  const isAllSelected = deleteQueue.length > 0 && selectedIds.size === deleteQueue.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      exitSelectMode();
    } else {
      setSelectedIds(new Set(deleteQueue.map((item) => item.photoId)));
    }
  };

  const handleRemoveSelected = () => {
    selectedIds.forEach((id) => removeFromDeleteQueue(id));
    exitSelectMode();
  };

  const LOW_STORAGE_BYTES = 50 * 1024 * 1024;

  const handleConfirmDelete = async () => {
    if (deleteQueue.length === 0) return;
    try {
      const free = await FileSystem.getFreeDiskStorageAsync();
      if (free < LOW_STORAGE_BYTES) {
        showToast(
          'warning',
          'Low Storage',
          'Your device is running low on storage. Deletion may still proceed.',
        );
      }
    } catch {
      // silently ignore
    }
    setConfirmSheetVisible(true);
  };

  const performDelete = async () => {
    setIsDeleting(true);
    setProgress({ completed: 0, total: deleteQueue.length });

    try {
      const photoIds = deleteQueue.map((item) => item.photoId);
      const result = await deleteService.deletePhotos(photoIds, deleteQueue, (p) => {
        setProgress(p);
      });

      if (result.errorType === 'PERMISSION_DENIED') {
        showToast('error', 'Permission Denied', 'Please allow PhotoSwipe to delete photos in your device settings.');
        return;
      }

      clearDeleteQueue();

      showToast(
        'success',
        'Photos Deleted',
        `${result.deletedCount} photo${result.deletedCount === 1 ? '' : 's'} removed, ${formatFileSize(totalSize)} freed`,
      );
    } catch {
      showToast('error', 'Deletion Failed', 'Some photos could not be deleted. Please try again.');
    } finally {
      setIsDeleting(false);
      setProgress(null);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<DeleteQueueItem>) => {
    const isSelected = selectedIds.has(item.photoId);
    return (
      <TouchableOpacity
        style={[styles.gridItem, { backgroundColor: colors.surface }]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
        delayLongPress={350}
      >
        <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
        {isSelected && (
          <View style={styles.checkmarkOverlay}>
            <Ionicons name="checkmark-circle" size={22} color="#007AFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isDeleting) {
    const pct =
      progress && progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.danger} />
          <Text style={[typography.headline, styles.deletingText, { color: colors.text }]}>
            Deleting photos...
          </Text>
          {progress && (
            <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
              {progress.completed} / {progress.total} ({pct}%)
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (deleteQueue.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[typography.title2, { color: colors.text }]}>Delete Queue</Text>
            {onDismiss && (
              <TouchableOpacity onPress={onDismiss}>
                <Text style={[typography.body, { color: colors.primary }]}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: 8 }]}>
            Queue is empty
          </Text>
          <Text style={[typography.subheadline, { color: colors.textSecondary, textAlign: 'center' }]}>
            Swipe left on photos to add them here.
          </Text>
        </View>
        <Toast {...toastProps} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        {selectMode ? (
          <View style={styles.headerRow}>
            <TouchableOpacity style={[styles.selectPill, { backgroundColor: colors.text }]} onPress={exitSelectMode}>
              <Ionicons name="close" size={14} color={colors.background} />
              <Text style={[styles.selectPillText, { color: colors.background }]}>{selectedIds.size}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectAllCircle, { borderColor: colors.textSecondary }, isAllSelected && styles.selectAllCircleFilled]}
              onPress={handleToggleSelectAll}
            >
              {isAllSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Text style={[typography.title2, { color: colors.text }]}>Delete Queue</Text>
              {onDismiss && (
                <TouchableOpacity onPress={onDismiss}>
                  <Text style={[typography.body, { color: colors.primary }]}>Back</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{deleteQueue.length} photos selected</Text>
          </>
        )}
      </View>

      <FlatList
        data={deleteQueue}
        keyExtractor={(item) => item.photoId}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={[styles.grid, { paddingBottom: 16 }]}
      />

      <View style={[styles.footer, {
        backgroundColor: colors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.separator,
      }]}>
        {selectedIds.size > 0 ? (
          <TouchableOpacity onPress={handleRemoveSelected} style={[styles.keepSelectedBtn, { backgroundColor: colors.text }]}>
            <Text style={[styles.keepSelectedText, { color: colors.background }]}>Keep Selected</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.text }]} onPress={handleConfirmDelete}>
            <Text style={[styles.deleteButtonText, { color: colors.background }]}>
              {totalSize > 0 ? `Delete All · ${formatFileSize(totalSize)}` : 'Delete All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={viewerUri !== null}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerUri(null)}
      >
        <Pressable style={styles.viewer} onPress={() => setViewerUri(null)}>
          <Image
            source={{ uri: viewerUri ?? '' }}
            style={styles.viewerImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>

      <ActionSheet
        visible={confirmSheetVisible}
        title={`Delete ${deleteQueue.length} photo${deleteQueue.length === 1 ? '' : 's'} and free ${formatFileSize(totalSize)}? This cannot be undone.`}
        actions={[
          {
            label: `Delete ${deleteQueue.length} Photo${deleteQueue.length === 1 ? '' : 's'}`,
            destructive: true,
            onPress: performDelete,
          },
        ]}
        onDismiss={() => setConfirmSheetVisible(false)}
      />
      <Toast {...toastProps} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  grid: {
    padding: ITEM_MARGIN,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: ITEM_MARGIN,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectAllCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllCircleFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  keepSelectedBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepSelectedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  deletingText: {
    marginTop: 16,
  },
  viewer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
});
