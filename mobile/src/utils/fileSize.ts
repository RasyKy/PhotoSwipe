import * as FileSystem from 'expo-file-system/legacy';

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file size in bytes from URI
 */
export async function getFileSize(uri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      console.warn(`File does not exist: ${uri}`);
      return 0;
    }

    return fileInfo.size || 0;
  } catch (error) {
    console.error(`Error getting file size for ${uri}:`, error);
    return 0;
  }
}

/**
 * Get file sizes for multiple URIs
 */
export async function getFileSizes(uris: string[]): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();

  try {
    const promises = uris.map(async (uri) => {
      const size = await getFileSize(uri);
      sizes.set(uri, size);
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error getting multiple file sizes:', error);
  }

  return sizes;
}
