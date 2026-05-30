import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { Photo } from '../types/index';

export type PermissionResult = {
  granted: boolean;
  canRetry: boolean;
};

export async function requestPermission(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
    if (status === 'granted') {
      return { granted: true, canRetry: false };
    }
    return { granted: false, canRetry: canAskAgain };
  } catch (error) {
    console.error('Failed to request media library permissions:', error);
    return { granted: false, canRetry: true };
  }
}

function isScreenshot(filename: string): boolean {
  return filename.toLowerCase().includes('screenshot');
}

// TODO: remove after Android file size debugging is done
let _debugLogged = false;

// getAssetsAsync does not populate fileSize on Android (SDK 54).
// Primary: getAssetInfoAsync returns a richer object that includes fileSize on both platforms.
// Fallback: FileSystem.getInfoAsync using localUri (content:// URIs may not resolve via FileSystem).
async function assetToPhoto(asset: MediaLibrary.Asset): Promise<Photo> {
  const isFirst = !_debugLogged;
  if (isFirst) {
    _debugLogged = true;
    console.log('[gallery debug] raw asset from getAssetsAsync:', JSON.stringify(asset, null, 2));
  }

  let fileSize = 0;
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    if (isFirst) {
      console.log('[gallery debug] getAssetInfoAsync result:', JSON.stringify(assetInfo, null, 2));
      console.log('[gallery debug] localUri:', assetInfo.localUri);
    }
    if (assetInfo.localUri) {
      const info = await FileSystem.getInfoAsync(assetInfo.localUri);
      fileSize = info.exists ? info.size : 0;
    }
  } catch (err) {
    console.warn('[gallery] getInfoAsync failed:', err);
    fileSize = 0;
  }
  return {
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    width: asset.width,
    height: asset.height,
    creationTime: asset.creationTime,
    fileSize,
    isScreenshot: isScreenshot(asset.filename),
  };
}

// Load photos in batches of 100 using getAssetsAsync with pagination cursor
export async function loadPhotoBatch(after?: string): Promise<{
  photos: Photo[];
  nextCursor: string | undefined;
}> {
  try {
    const result = await MediaLibrary.getAssetsAsync({
      first: 100,
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      mediaType: [MediaLibrary.MediaType.photo],
    });

    const photos = await Promise.all(result.assets.map(assetToPhoto));

    return {
      photos,
      nextCursor: result.endCursor || undefined,
    };
  } catch (error) {
    console.error('Failed to load photo batch:', error);
    return {
      photos: [],
      nextCursor: undefined,
    };
  }
}

// Re-fetch file sizes for photos that were restored from AsyncStorage with stale fileSize: 0.
// Processed in batches of 20 to avoid overwhelming the device with concurrent stat calls.
async function refreshSinglePhotoSize(photo: Photo): Promise<Photo> {
  console.log('[refreshSize] processing photo id:', photo.id);
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.id);
    console.log('[refreshSize] localUri:', assetInfo.localUri ?? 'undefined');
    if (assetInfo.localUri) {
      const info = await FileSystem.getInfoAsync(assetInfo.localUri);
      const size = info.exists ? info.size : 0;
      console.log('[refreshSize] FileSystem size:', size, '| exists:', info.exists);
      if (size > 0) {
        console.log('[refreshSize] success — returning size', size, 'for', photo.id);
        return { ...photo, fileSize: size };
      }
      console.log('[refreshSize] fallback — size was 0 or file missing for', photo.id);
    } else {
      console.log('[refreshSize] fallback — no localUri for', photo.id);
    }
  } catch (err) {
    console.log('[refreshSize] error for', photo.id, ':', err);
  }
  return photo;
}

export async function refreshPhotoSizes(photos: Photo[]): Promise<Photo[]> {
  const BATCH_SIZE = 20;
  const results: Photo[] = [];
  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);
    const refreshed = await Promise.all(batch.map(refreshSinglePhotoSize));
    results.push(...refreshed);
  }
  return results;
}

// Get total photo count on device without loading any assets
export async function getTotalPhotoCount(): Promise<number> {
  try {
    const result = await MediaLibrary.getAssetsAsync({
      first: 1,
      mediaType: [MediaLibrary.MediaType.photo],
    });
    return result.totalCount;
  } catch {
    return 0;
  }
}

// Load first batch of photos
export async function loadFirstBatch(): Promise<Photo[]> {
  try {
    const { photos } = await loadPhotoBatch();
    return photos;
  } catch (error) {
    console.error('Failed to load first batch of photos:', error);
    return [];
  }
}

// Pre-load next batch of photos (for optimization)
export async function preloadNextBatch(currentCursor: string | undefined): Promise<Photo[]> {
  if (!currentCursor) {
    return [];
  }

  try {
    const { photos } = await loadPhotoBatch(currentCursor);
    return photos;
  } catch (error) {
    console.error('Failed to preload next batch:', error);
    return [];
  }
}

// Load all photo IDs
export async function loadAllPhotoIds(): Promise<string[]> {
  let allPhotoIds: string[] = [];
  let nextCursor: string | undefined = undefined;

  try {
    do {
      const { photos, nextCursor: newCursor } = await loadPhotoBatch(nextCursor);
      allPhotoIds = allPhotoIds.concat(photos.map((photo) => photo.id));
      nextCursor = newCursor;
    } while (nextCursor);
  } catch (error) {
    console.error('Failed to load all photo IDs:', error);
  }

  return allPhotoIds;
}