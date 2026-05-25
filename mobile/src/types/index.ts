// TypeScript interfaces for PhotoSwipe

export interface Photo {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  creationTime: number;
  fileSize: number;
}

export interface SwipeAction {
  photoId: string;
  action: 'keep' | 'delete';
  timestamp: number;
}

export interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  actions: SwipeAction[];
}

export interface DeleteQueueItem {
  photoId: string;
  uri: string;
  size: number; // in bytes
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}