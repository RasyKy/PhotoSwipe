import * as MediaLibrary from 'expo-media-library';
import { Photo } from '../types/index';

// Request MEDIA_LIBRARY permissions
export async function requestPermission(): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request media library permissions:', error);
    return false;
  }
}

// Convert MediaLibrary.Asset to Photo type
function assetToPhoto(asset: MediaLibrary.Asset): Photo {
  return {
    id: asset.id,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    creationTime: asset.creationTime,
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

    return {
      photos: result.assets.map(assetToPhoto),
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