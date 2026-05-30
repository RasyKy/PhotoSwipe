import { useSwipeStore } from '../store/swipeStore';
import { Photo } from '../types/index';

const makePhoto = (id: string, fileSize = 0): Photo => ({
  id,
  uri: `file://${id}.jpg`,
  filename: `${id}.jpg`,
  width: 100,
  height: 100,
  creationTime: 0,
  fileSize,
  isScreenshot: false,
});

const PHOTO_A = makePhoto('a', 500_000);
const PHOTO_B = makePhoto('b', 1_000_000);

function seedTwoPhotos() {
  useSwipeStore.setState({
    photos: [PHOTO_A, PHOTO_B],
    currentIndex: 0,
    swipedPhotos: new Set(),
    deleteQueue: [],
  });
}

describe('useSwipeStore', () => {
  beforeEach(() => {
    useSwipeStore.getState().reset();
    seedTwoPhotos();
  });

  describe('swipePhoto — keep', () => {
    it('advances currentIndex by 1', () => {
      useSwipeStore.getState().swipePhoto('keep');
      expect(useSwipeStore.getState().currentIndex).toBe(1);
    });

    it('adds the photo to swipedPhotos', () => {
      useSwipeStore.getState().swipePhoto('keep');
      expect(useSwipeStore.getState().swipedPhotos.has('a')).toBe(true);
    });

    it('does not add the photo to deleteQueue', () => {
      useSwipeStore.getState().swipePhoto('keep');
      expect(useSwipeStore.getState().deleteQueue).toHaveLength(0);
    });
  });

  describe('swipePhoto — delete', () => {
    it('advances currentIndex by 1', () => {
      useSwipeStore.getState().swipePhoto('delete');
      expect(useSwipeStore.getState().currentIndex).toBe(1);
    });

    it('adds the photo to deleteQueue with correct photoId and size', () => {
      useSwipeStore.getState().swipePhoto('delete');
      const queue = useSwipeStore.getState().deleteQueue;
      expect(queue).toHaveLength(1);
      expect(queue[0].photoId).toBe('a');
      expect(queue[0].size).toBe(500_000);
    });

    it('accumulates multiple deleted photos in order', () => {
      useSwipeStore.getState().swipePhoto('delete');
      useSwipeStore.getState().swipePhoto('delete');
      const queue = useSwipeStore.getState().deleteQueue;
      expect(queue).toHaveLength(2);
      expect(queue[0].photoId).toBe('a');
      expect(queue[1].photoId).toBe('b');
    });

    it('does not add kept photos to deleteQueue', () => {
      useSwipeStore.getState().swipePhoto('keep');
      useSwipeStore.getState().swipePhoto('delete');
      const queue = useSwipeStore.getState().deleteQueue;
      expect(queue).toHaveLength(1);
      expect(queue[0].photoId).toBe('b');
    });
  });

  describe('undoSwipe', () => {
    it('decrements currentIndex', () => {
      useSwipeStore.getState().swipePhoto('keep');
      useSwipeStore.getState().undoSwipe();
      expect(useSwipeStore.getState().currentIndex).toBe(0);
    });

    it('removes the photo from swipedPhotos', () => {
      useSwipeStore.getState().swipePhoto('keep');
      useSwipeStore.getState().undoSwipe();
      expect(useSwipeStore.getState().swipedPhotos.has('a')).toBe(false);
    });

    it('removes photo from deleteQueue when undoing a delete swipe', () => {
      useSwipeStore.getState().swipePhoto('delete');
      expect(useSwipeStore.getState().deleteQueue).toHaveLength(1);
      useSwipeStore.getState().undoSwipe();
      expect(useSwipeStore.getState().deleteQueue).toHaveLength(0);
    });

    it('leaves deleteQueue unchanged when undoing a keep swipe', () => {
      useSwipeStore.getState().swipePhoto('delete');
      useSwipeStore.getState().swipePhoto('keep');
      useSwipeStore.getState().undoSwipe();
      expect(useSwipeStore.getState().deleteQueue).toHaveLength(1);
      expect(useSwipeStore.getState().deleteQueue[0].photoId).toBe('a');
    });

    it('does nothing when already at the start', () => {
      useSwipeStore.getState().undoSwipe();
      expect(useSwipeStore.getState().currentIndex).toBe(0);
    });
  });

  describe('removeFromDeleteQueue', () => {
    it('removes the item matching the given photoId', () => {
      useSwipeStore.getState().swipePhoto('delete');
      useSwipeStore.getState().swipePhoto('delete');
      useSwipeStore.getState().removeFromDeleteQueue('a');
      const queue = useSwipeStore.getState().deleteQueue;
      expect(queue).toHaveLength(1);
      expect(queue[0].photoId).toBe('b');
    });

    it('leaves the queue unchanged when photoId is not present', () => {
      useSwipeStore.getState().swipePhoto('delete');
      useSwipeStore.getState().removeFromDeleteQueue('nonexistent');
      expect(useSwipeStore.getState().deleteQueue).toHaveLength(1);
    });

    it('results in an empty queue when the only item is removed', () => {
      useSwipeStore.getState().swipePhoto('delete');
      useSwipeStore.getState().removeFromDeleteQueue('a');
      expect(useSwipeStore.getState().deleteQueue).toHaveLength(0);
    });
  });

  describe('reset (clearSession)', () => {
    it('clears photos', () => {
      useSwipeStore.getState().reset();
      expect(useSwipeStore.getState().photos).toHaveLength(0);
    });

    it('resets currentIndex to 0', () => {
      useSwipeStore.getState().swipePhoto('keep');
      useSwipeStore.getState().reset();
      expect(useSwipeStore.getState().currentIndex).toBe(0);
    });

    it('clears deleteQueue', () => {
      useSwipeStore.getState().swipePhoto('delete');
      useSwipeStore.getState().reset();
      expect(useSwipeStore.getState().deleteQueue).toHaveLength(0);
    });

    it('clears swipedPhotos', () => {
      useSwipeStore.getState().swipePhoto('keep');
      useSwipeStore.getState().reset();
      expect(useSwipeStore.getState().swipedPhotos.size).toBe(0);
    });

    it('clears sessionId', () => {
      useSwipeStore.getState().setSessionId('session-xyz');
      useSwipeStore.getState().reset();
      expect(useSwipeStore.getState().sessionId).toBeNull();
    });
  });
});
