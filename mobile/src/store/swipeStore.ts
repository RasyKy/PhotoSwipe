import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DeleteQueueItem, Photo } from '../types/index';

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

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// JSON replacer: serialise Set as a tagged object so the reviver can reconstruct it.
// Using a __type tag rather than key-name matching makes it robust to renaming.
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Set) {
    return { __type: 'Set', data: Array.from(value as Set<unknown>) };
  }
  return value;
}

// JSON reviver: reconstruct Set from the tagged object produced by replacer.
function reviver(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).__type === 'Set'
  ) {
    return new Set((value as { __type: string; data: unknown[] }).data);
  }
  return value;
}

export const useSwipeStore = create<SwipeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      photos: [],
      currentIndex: 0,
      swipedPhotos: new Set(),
      deleteQueue: [],
      sessionId: null,

      initializePhotos: (photos: Photo[]) => {
        const shuffled = shuffleArray(photos);
        set({
          photos: shuffled,
          currentIndex: 0,
          swipedPhotos: new Set(),
        });
      },

      shufflePhotos: () => {
        set((state) => ({
          photos: shuffleArray(state.photos),
          currentIndex: 0,
          swipedPhotos: new Set(),
        }));
      },

      getCurrentPhoto: () => {
        const state = get();
        return state.photos[state.currentIndex] ?? null;
      },

      swipePhoto: (action: 'keep' | 'delete') => {
        set((state) => {
          const currentPhoto = state.photos[state.currentIndex];
          if (!currentPhoto) return state;

          const newSwiped = new Set(state.swipedPhotos);
          newSwiped.add(currentPhoto.id);

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

      undoSwipe: () => {
        set((state) => {
          if (state.currentIndex === 0) return state;

          const previousIndex = state.currentIndex - 1;
          const previousPhoto = state.photos[previousIndex];

          const newSwiped = new Set(state.swipedPhotos);
          newSwiped.delete(previousPhoto.id);

          const newDeleteQueue = state.deleteQueue.filter(
            (item) => item.photoId !== previousPhoto.id,
          );

          return {
            currentIndex: previousIndex,
            swipedPhotos: newSwiped,
            deleteQueue: newDeleteQueue,
          };
        });
      },

      addToDeleteQueue: (photo: Photo, size: number) => {
        set((state) => {
          const alreadyInQueue = state.deleteQueue.some(
            (item) => item.photoId === photo.id,
          );
          if (alreadyInQueue) return state;

          return {
            deleteQueue: [
              ...state.deleteQueue,
              { photoId: photo.id, uri: photo.uri, size },
            ],
          };
        });
      },

      removeFromDeleteQueue: (photoId: string) => {
        set((state) => ({
          deleteQueue: state.deleteQueue.filter((item) => item.photoId !== photoId),
        }));
      },

      clearDeleteQueue: () => {
        set({ deleteQueue: [] });
      },

      setSessionId: (sessionId: string) => {
        set({ sessionId });
      },

      setSwipedPhotos: (photoIds: Set<string>) => {
        set({ swipedPhotos: photoIds });
      },

      setDeleteQueue: (items: DeleteQueueItem[]) => {
        set({ deleteQueue: items });
      },

      addPhotos: (newPhotos: Photo[]) => {
        set((state) => ({
          photos: [...state.photos, ...shuffleArray(newPhotos)],
        }));
      },

      reset: () => {
        set({
          photos: [],
          currentIndex: 0,
          swipedPhotos: new Set(),
          deleteQueue: [],
          sessionId: null,
        });
      },
    }),
    {
      name: 'photoswipe-swipe-store',
      storage: createJSONStorage(() => AsyncStorage, { replacer, reviver }),
      // Persist only data fields; actions are always reconstructed from the creator.
      partialize: (state) => ({
        photos: state.photos,
        currentIndex: state.currentIndex,
        swipedPhotos: state.swipedPhotos,
        deleteQueue: state.deleteQueue,
        sessionId: state.sessionId,
      }),
    },
  ),
);
