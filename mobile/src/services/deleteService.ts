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

type ProgressCallback = (progress: DeleteProgress) => void;

class DeleteService {
  /**
   * Delete photos from device and confirm with API
   */
  async deletePhotos(
    photoIds: string[],
    deleteQueueItems: DeleteQueueItem[],
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; deletedCount: number; failedCount: number }> {
    if (photoIds.length === 0) {
      return { success: true, deletedCount: 0, failedCount: 0 };
    }

    try {
      // 1. Confirm deletion with API
      if (onProgress) {
        onProgress({ completed: 0, total: photoIds.length });
      }
      
      const sessionId = sessionService.getSessionId() ?? '';
      const apiResponse = await api.confirmDelete(sessionId);
      if (!apiResponse.success) {
        console.warn('API confirmDelete returned false');
      }

      // 2. Delete from device in one go (more efficient)
      try {
        await MediaLibrary.deleteAssetsAsync(photoIds);
        
        if (onProgress) {
          onProgress({ completed: photoIds.length, total: photoIds.length });
        }
        
        return { success: true, deletedCount: photoIds.length, failedCount: 0 };
      } catch (error) {
        console.error('Batch deletion failed, trying individually:', error);
        
        // Fallback to individual deletion if batch fails
        let deletedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < photoIds.length; i++) {
          try {
            await MediaLibrary.deleteAssetsAsync([photoIds[i]]);
            deletedCount++;
          } catch (err) {
            failedCount++;
          }
          
          if (onProgress) {
            onProgress({ completed: i + 1, total: photoIds.length });
          }
        }

        return { success: failedCount === 0, deletedCount, failedCount };
      }
    } catch (error) {
      console.error('Error in deletePhotos:', error);
      return { success: false, deletedCount: 0, failedCount: photoIds.length };
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
