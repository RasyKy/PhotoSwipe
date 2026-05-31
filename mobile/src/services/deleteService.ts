import * as MediaLibrary from 'expo-media-library';
import api from './api';
import { sessionService } from './sessionService';
import { DeleteQueueItem } from '../types/index';

export interface DeleteProgress {
  completed: number;
  total: number;
  currentPhotoId?: string;
  error?: string;
}

export type DeleteErrorType = 'PERMISSION_DENIED';

export interface DeleteResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  storageSavedBytes: number;
  errorType?: DeleteErrorType;
}

type ProgressCallback = (progress: DeleteProgress) => void;

function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('permission') || msg.includes('denied') || msg.includes('access');
}

class DeleteService {
  /**
   * Delete photos from device and confirm with API
   */
  async deletePhotos(
    photoIds: string[],
    deleteQueueItems: DeleteQueueItem[],
    onProgress?: ProgressCallback
  ): Promise<DeleteResult> {
    if (photoIds.length === 0) {
      return { success: true, deletedCount: 0, failedCount: 0, storageSavedBytes: 0 };
    }

    try {
      if (onProgress) {
        onProgress({ completed: 0, total: photoIds.length });
      }

      const sessionId = sessionService.getSessionId() ?? '';

      try {
        await MediaLibrary.deleteAssetsAsync(photoIds);

        if (onProgress) {
          onProgress({ completed: photoIds.length, total: photoIds.length });
        }

        const storageSavedBytes = deleteQueueItems.reduce((sum, item) => sum + item.size, 0);
        api.confirmDelete(sessionId, photoIds.length, storageSavedBytes).catch((err) => {
          console.error('confirmDelete sync failed:', err);
        });

        return { success: true, deletedCount: photoIds.length, failedCount: 0, storageSavedBytes };
      } catch (error) {
        if (isPermissionError(error)) {
          return { success: false, deletedCount: 0, failedCount: photoIds.length, storageSavedBytes: 0, errorType: 'PERMISSION_DENIED' };
        }

        console.error('Batch deletion failed, trying individually:', error);

        let deletedCount = 0;
        let failedCount = 0;
        let storageSavedBytes = 0;

        for (let i = 0; i < photoIds.length; i++) {
          try {
            await MediaLibrary.deleteAssetsAsync([photoIds[i]]);
            deletedCount++;
            storageSavedBytes += deleteQueueItems[i]?.size ?? 0;
          } catch (err) {
            if (isPermissionError(err)) {
              return {
                success: false,
                deletedCount,
                failedCount: photoIds.length - deletedCount,
                storageSavedBytes,
                errorType: 'PERMISSION_DENIED',
              };
            }
            failedCount++;
          }

          if (onProgress) {
            onProgress({ completed: i + 1, total: photoIds.length });
          }
        }

        if (deletedCount > 0) {
          api.confirmDelete(sessionId, deletedCount, storageSavedBytes).catch((err) => {
            console.error('confirmDelete sync failed:', err);
          });
        }

        return { success: failedCount === 0, deletedCount, failedCount, storageSavedBytes };
      }
    } catch (error) {
      console.error('Error in deletePhotos:', error);
      return { success: false, deletedCount: 0, failedCount: photoIds.length, storageSavedBytes: 0 };
    }
  }

  /**
   * Delete a single photo from device storage
   */
  private async deletePhotoFromDevice(photoId: string): Promise<void> {
    try {
      // Delete from MediaLibrary
      await MediaLibrary.deleteAssetsAsync([photoId]);
    } catch (error) {
      // If MediaLibrary deletion fails, try file system deletion as fallback
      console.warn(`MediaLibrary deletion failed for ${photoId}, trying file system:`, error);
      throw error;
    }
  }

  /**
   * Get thumbnail for a photo URI
   */
  async getThumbnail(uri: string, size: number = 150): Promise<string> {
    try {
      // For local file URIs, return as-is
      // In a real app, you might want to generate actual thumbnails
      return uri;
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      return uri;
    }
  }

  /**
   * Batch load photos in groups (for optimization)
   */
  async loadPhotosInBatches(
    photoCount: number,
    batchSize: number = 100,
    onBatchLoaded?: (batchNumber: number, totalBatches: number) => void
  ): Promise<number> {
    const totalBatches = Math.ceil(photoCount / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      if (onBatchLoaded) {
        onBatchLoaded(i + 1, totalBatches);
      }

      // Simulate batch loading with a small delay
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return totalBatches;
  }
}

export const deleteService = new DeleteService();
