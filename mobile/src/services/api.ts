const BASE_URL = 'http://localhost:8000'; // Default to local backend
const USE_MOCK = true;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    return { success: false, error: errorData.detail || response.statusText };
  }
  const data = await response.json();
  return { success: true, data };
};

const realApi = {
  createSession: async (): Promise<ApiResponse<{ sessionId: string }>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  endSession: async (sessionId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/end`, {
        method: 'POST',
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  recordSwipe: async (
    sessionId: string,
    photoId: string,
    action: 'keep' | 'delete'
  ): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, action, timestamp: Date.now() }),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  undoSwipe: async (
    sessionId: string,
    photoId: string
  ): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/actions/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  getDeleteQueue: async (): Promise<ApiResponse<{ queue: { photoId: string; uri: string }[] }>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/delete-queue`);
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  removeFromDeleteQueue: async (
    photoId: string
  ): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/delete-queue/${photoId}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  confirmDelete: async (
    photoIds: string[]
  ): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/confirm-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },
};

const mockApi = {
  createSession: async (): Promise<ApiResponse<{ sessionId: string }>> => {
    return { success: true, data: { sessionId: 'mock-session-id' } };
  },
  endSession: async (sessionId: string): Promise<ApiResponse<null>> => {
    return { success: true };
  },
  recordSwipe: async (
    sessionId: string,
    photoId: string,
    action: 'keep' | 'delete'
  ): Promise<ApiResponse<null>> => {
    return { success: true };
  },
  undoSwipe: async (
    sessionId: string,
    photoId: string
  ): Promise<ApiResponse<null>> => {
    return { success: true };
  },
  getDeleteQueue: async (): Promise<ApiResponse<{ queue: { photoId: string; uri: string }[] }>> => {
    return { success: true, data: { queue: [] } };
  },
  removeFromDeleteQueue: async (
    photoId: string
  ): Promise<ApiResponse<null>> => {
    return { success: true };
  },
  confirmDelete: async (
    photoIds: string[]
  ): Promise<ApiResponse<null>> => {
    return { success: true };
  },
};

const api = USE_MOCK ? mockApi : realApi;

export default api;