import * as FileSystem from 'expo-file-system/legacy';

export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://photoswipe.onrender.com/api/v1';
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';
const USE_MOCK = false;

interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string | null;
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
});

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { success: false, data: null, error: body?.error || body?.detail || response.statusText };
  }
  return { success: body?.success ?? true, data: body?.data ?? null, error: body?.error ?? null };
};

const realApi = {
  registerUser: async (deviceId: string): Promise<ApiResponse<{ id: string; device_id: string; created_at: string }>> => {
    try {
      const response = await fetch(`${BASE_URL}/users/register`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ device_id: deviceId }),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  createSession: async (userId: string): Promise<ApiResponse<{ id: string; user_id: string; status: string; total_reviewed: number; total_kept: number; total_deleted: number; storage_saved_bytes: number; started_at: string; ended_at: string | null }>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ user_id: userId }),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  endSession: async (sessionId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status: 'completed' }),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  recordSwipe: async (
    sessionId: string,
    photoUri: string,
    photoName: string,
    fileSizeBytes: number,
    action: 'keep' | 'delete'
  ): Promise<ApiResponse<{ id: string; action: string; swiped_at: string }>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/swipe`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ session_id: sessionId, photo_uri: photoUri, photo_name: photoName, file_size_bytes: fileSizeBytes, action }),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  undoSwipe: async (sessionId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/undo`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ session_id: sessionId }),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  confirmDelete: async (sessionId: string, deletedCount: number, storageSavedBytes: number): Promise<ApiResponse<{ deleted_count: number; storage_freed_bytes: number }>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/confirm-delete`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ session_id: sessionId, deleted_count: deletedCount, storage_freed_bytes: storageSavedBytes }),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  getAnalyticsSummary: async (userId: string): Promise<ApiResponse<{ total_reviewed: number; total_kept: number; total_deleted: number; total_storage_saved_bytes: number; total_sessions: number }>> => {
    try {
      const response = await fetch(`${BASE_URL}/analytics/summary?user_id=${userId}`, {
        headers: headers(),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  getAnalyticsHistory: async (userId: string, period: 'week' | 'month' | 'all'): Promise<ApiResponse<{ date: string; reviewed: number; kept: number; deleted: number; storage_saved_bytes: number }[]>> => {
    try {
      const response = await fetch(`${BASE_URL}/analytics/history?user_id=${userId}&period=${period}`, {
        headers: headers(),
      });
      return handleResponse(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  recordSwipeBatch: async (
    sessionId: string,
    swipes: Array<{ photoUri: string; photoName: string; fileSizeBytes: number; action: 'keep' | 'delete' }>
  ): Promise<ApiResponse<{ processed: number }>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/swipe/batch`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          session_id: sessionId,
          swipes: swipes.map((s) => ({
            photo_uri: s.photoUri,
            photo_name: s.photoName,
            file_size_bytes: s.fileSizeBytes,
            action: s.action,
          })),
        }),
      });
      return handleResponse<{ processed: number }>(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  backupUpload: async (userId: string, photoUri: string, photoName: string): Promise<ApiResponse<null>> => {
    try {
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
      } catch {
        return { success: false, data: null, error: 'Failed to read photo file' };
      }
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('photo_name', photoName);
      formData.append('file', base64);
      const response = await fetch(`${BASE_URL}/backup/upload`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
        body: formData,
      });
      return handleResponse<null>(response);
    } catch {
      return { success: false, data: null, error: 'Network error' };
    }
  },
};

const mockApi: typeof realApi = {
  registerUser: async (deviceId) => ({ success: true, data: { id: 'mock-user-id', device_id: deviceId, created_at: new Date().toISOString() } }),
  createSession: async (userId) => ({ success: true, data: { id: 'mock-session-id', user_id: userId, status: 'active', total_reviewed: 0, total_kept: 0, total_deleted: 0, storage_saved_bytes: 0, started_at: new Date().toISOString(), ended_at: null } }),
  endSession: async (_sessionId) => ({ success: true, data: null }),
  recordSwipe: async (_sessionId, _photoUri, _photoName, _fileSizeBytes, _action) => ({ success: true, data: { id: 'mock-swipe-id', action: _action, swiped_at: new Date().toISOString() } }),
  undoSwipe: async (_sessionId) => ({ success: true, data: null }),
  confirmDelete: async (_sessionId, _deletedCount, _storageSavedBytes) => ({ success: true, data: { deleted_count: 0, storage_freed_bytes: 0 } }),
  getAnalyticsSummary: async (_userId) => ({ success: true, data: { total_reviewed: 0, total_kept: 0, total_deleted: 0, total_storage_saved_bytes: 0, total_sessions: 0 } }),
  getAnalyticsHistory: async (_userId, _period) => ({ success: true, data: [] }),
  recordSwipeBatch: async (_sessionId, swipes) => ({ success: true, data: { processed: swipes.length } }),
  backupUpload: async (_userId, _photoUri, _photoName) => ({ success: true, data: null }),
};

const api = USE_MOCK ? mockApi : realApi;

export default api;
