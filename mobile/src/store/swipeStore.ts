import { create } from 'zustand';
import { Photo, SwipeAction, DeleteQueueItem } from '../types/index';

interface SwipeStore {
  // State
  photos: Photo[];
  currentIndex: number;
  swipedPhotos: Set<string>;
  deleteQueue: DeleteQueueItem[];
  sessionId: string | null;

  // Actions
  initializePhotos: (photos: Photo[]) => void;
  shufflePhotos: () => void;
  getCurrentPhoto: () => Photo | null;
  swipePhoto: (action: 'keep' | 'delete') => void;
  undoSwipe: () => void;
  addToDeleteQueue: (photo: Photo, size: number) => void;
  removeFromDeleteQueue: (photoId: string) => void;
  clearDeleteQueue: () => void;
  setSessionId: (sessionId: string) => void;
  setSwipedPhotos: (photoIds: Set<string>) => void;
  setDeleteQueue: (items: DeleteQueueItem[]) => void;
  addPhotos: (newPhotos: Photo[]) => void;
  reset: () => void;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const useSwipeStore = create<SwipeStore>((set, get) => ({
  // Initial state
  photos: [],
  currentIndex: 0,
  swipedPhotos: new Set(),
  deleteQueue: [],
  sessionId: null,

  // Initialize photos with shuffling
  initializePhotos: (photos: Photo[]) => {
    const shuffled = shuffleArray(photos);
    set({
      photos: shuffled,
      currentIndex: 0,
      swipedPhotos: new Set(),
    });
  },

  // Shuffle photos (resets current index and swiped state)
  shufflePhotos: () => {
    set((state) => ({
      photos: shuffleArray(state.photos),
      currentIndex: 0,
      swipedPhotos: new Set(),
    }));
  },

  // Get the current photo being viewed
  getCurrentPhoto: () => {
    const state = get();
    return state.photos[state.currentIndex] || null;
  },

  // Handle swipe action (move to next photo)
  swipePhoto: (action: 'keep' | 'delete') => {
    set((state) => {
      const currentPhoto = state.photos[state.currentIndex];
      if (!currentPhoto) return state;

      const newSwiped = new Set(state.swipedPhotos);
      newSwiped.add(currentPhoto.id);

      // If delete action, add to delete queue
      let newDeleteQueue = state.deleteQueue;
      if (action === 'delete') {
        const queueItem: DeleteQueueItem = {
          photoId: currentPhoto.id,
          uri: currentPhoto.uri,
          size: currentPhoto.fileSize,
        };
        newDeleteQueue = [...state.deleteQueue, queueItem];
      }

      return {
        currentIndex: state.currentIndex + 1,
        swipedPhotos: newSwiped,
        deleteQueue: newDeleteQueue,
      };
    });
  },

  // Undo the last swipe
  undoSwipe: () => {
    set((state) => {
      if (state.currentIndex === 0) return state;

      const previousIndex = state.currentIndex - 1;
      const previousPhoto = state.photos[previousIndex];

      const newSwiped = new Set(state.swipedPhotos);
      newSwiped.delete(previousPhoto.id);

      // Remove from delete queue if it was there
      const newDeleteQueue = state.deleteQueue.filter(
        (item) => item.photoId !== previousPhoto.id
      );

      return {
        currentIndex: previousIndex,
        swipedPhotos: newSwiped,
        deleteQueue: newDeleteQueue,
      };
    });
  },

  // Add photo to delete queue
  addToDeleteQueue: (photo: Photo, size: number) => {
    set((state) => {
      // Check if already in queue
      const alreadyInQueue = state.deleteQueue.some(
        (item) => item.photoId === photo.id
      );
      if (alreadyInQueue) return state;

      return {
        deleteQueue: [
          ...state.deleteQueue,
          {
            photoId: photo.id,
            uri: photo.uri,
            size,
          },
        ],
      };
    });
  },

  // Remove photo from delete queue
  removeFromDeleteQueue: (photoId: string) => {
    set((state) => ({
      deleteQueue: state.deleteQueue.filter((item) => item.photoId !== photoId),
    }));
  },

  // Clear entire delete queue
  clearDeleteQueue: () => {
    set({ deleteQueue: [] });
  },

  // Set session ID
  setSessionId: (sessionId: string) => {
    set({ sessionId });
  },

  // Set swiped photos (for session resumption)
  setSwipedPhotos: (photoIds: Set<string>) => {
    set({ swipedPhotos: photoIds });
  },

  // Set delete queue (for session resumption)
  setDeleteQueue: (items: DeleteQueueItem[]) => {
    set({ deleteQueue: items });
  },

  // Add new photos with shuffling
  addPhotos: (newPhotos: Photo[]) => {
    set((state) => ({
      photos: [...state.photos, ...shuffleArray(newPhotos)],
    }));
  },

  // Reset store to initial state
  reset: () => {
    set({
      photos: [],
      currentIndex: 0,
      swipedPhotos: new Set(),
      deleteQueue: [],
      sessionId: null,
    });
  },
}));
