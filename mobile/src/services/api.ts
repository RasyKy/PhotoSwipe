const BASE_URL = 'https://photoswipe.onrender.com/api/v1';
const API_KEY = '_uvqlhLh5vMZzPqYOUhiI4YzImYbELKo_L22gNlAk5s';
const USE_MOCK = false;

interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string | null;
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
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  endSession: async (sessionId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, data: null, error: 'Network error' };
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
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ photoId, action, timestamp: Date.now() }),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  undoSwipe: async (
    sessionId: string,
    photoId: string
  ): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/actions/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ photoId }),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  getDeleteQueue: async (): Promise<ApiResponse<{ queue: { photoId: string; uri: string }[] }>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/delete-queue`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  removeFromDeleteQueue: async (
    photoId: string
  ): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/delete-queue/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, data: null, error: 'Network error' };
    }
  },

  confirmDelete: async (
    photoIds: string[]
  ): Promise<ApiResponse<null>> => {
    try {
      const response = await fetch(`${BASE_URL}/photos/confirm-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ photoIds }),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, data: null, error: 'Network error' };
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