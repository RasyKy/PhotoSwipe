import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import api from './api';
import { useSwipeStore } from '../store/swipeStore';
import { SwipeAction } from '../types/index';

const SESSION_STORAGE_KEY = 'photoswipe_session';
const SESSION_ACTIONS_KEY = 'photoswipe_session_actions';
const USER_ID_STORAGE_KEY = 'photoswipe_user_id';
const DEVICE_ID_STORAGE_KEY = 'photoswipe_device_id';

interface SessionState {
  sessionId: string;
  startTime: number;
  actions: SwipeAction[];
}

function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class SessionService {
  private currentSession: SessionState | null = null;
  private cachedUserId: string | null = null;

  private async registerOrGetUser(): Promise<string> {
    if (this.cachedUserId !== null) return this.cachedUserId;

    const storedUserId = await AsyncStorage.getItem(USER_ID_STORAGE_KEY);
    if (storedUserId) {
      this.cachedUserId = storedUserId;
      return storedUserId;
    }

    let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }

    const response = await api.registerUser(deviceId);
    if (!response.success || !response.data) {
      throw new Error('Failed to register user');
    }

    this.cachedUserId = response.data.id;
    await AsyncStorage.setItem(USER_ID_STORAGE_KEY, response.data.id);
    return response.data.id;
  }

  async initializeSession(): Promise<string> {
    try {
      const savedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      const savedActions = await AsyncStorage.getItem(SESSION_ACTIONS_KEY);

      if (savedSession && savedActions) {
        this.currentSession = JSON.parse(savedSession);
        this.currentSession!.actions = JSON.parse(savedActions);
        console.log('Resumed session:', this.currentSession!.sessionId);
        return this.currentSession!.sessionId;
      }

      const userId = await this.registerOrGetUser();
      const response = await api.createSession(userId);

      if (!response.success || !response.data) {
        throw new Error('Failed to create session');
      }

      this.currentSession = {
        sessionId: response.data.id,
        startTime: Date.now(),
        actions: [],
      };

      await this.saveSession();
      console.log('Created new session:', this.currentSession.sessionId);
      return this.currentSession.sessionId;
    } catch (error) {
      console.error('Error initializing session:', error);
      this.currentSession = {
        sessionId: `local-${Date.now()}`,
        startTime: Date.now(),
        actions: [],
      };
      return this.currentSession.sessionId;
    }
  }

  async recordSwipe(photoId: string, action: 'keep' | 'delete'): Promise<boolean> {
    if (!this.currentSession) {
      console.error('No active session');
      return false;
    }

    try {
      const swipeAction: SwipeAction = { photoId, action, timestamp: Date.now() };

      const photo = useSwipeStore.getState().photos.find((p) => p.id === photoId);

      const response = await api.recordSwipe(
        this.currentSession.sessionId,
        photo?.uri ?? photoId,
        photo?.filename ?? photoId,
        photo?.fileSize ?? 0,
        action
      );

      if (!response.success) {
        console.warn('API recordSwipe failed, continuing locally');
      }

      this.currentSession.actions.push(swipeAction);
      await this.saveSession();

      if (action === 'keep') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      return true;
    } catch (error) {
      console.error('Error recording swipe:', error);
      return false;
    }
  }

  async undoSwipe(): Promise<boolean> {
    if (!this.currentSession || this.currentSession.actions.length === 0) {
      console.error('No actions to undo');
      return false;
    }

    let lastAction: SwipeAction | undefined;
    try {
      lastAction = this.currentSession.actions.pop();
      if (!lastAction) return false;

      const response = await api.undoSwipe(this.currentSession.sessionId);

      if (!response.success) {
        console.warn('API undoSwipe failed, continuing locally');
      }

      await this.saveSession();
      await Haptics.selectionAsync();

      return true;
    } catch (error) {
      console.error('Error undoing swipe:', error);
      if (lastAction) {
        this.currentSession.actions.push(lastAction);
      }
      return false;
    }
  }

  async endSession(): Promise<boolean> {
    if (!this.currentSession) return false;

    try {
      const response = await api.endSession(this.currentSession.sessionId);

      if (!response.success) {
        console.warn('API endSession failed');
      }

      await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, SESSION_ACTIONS_KEY]);
      this.currentSession = null;
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  getSessionId(): string | null {
    return this.currentSession?.sessionId ?? null;
  }

  async getUserId(): Promise<string | null> {
    if (this.cachedUserId !== null) return this.cachedUserId;
    const id = await AsyncStorage.getItem(USER_ID_STORAGE_KEY);
    if (id !== null) this.cachedUserId = id;
    return id;
  }

  getActions(): SwipeAction[] {
    return this.currentSession?.actions ?? [];
  }

  private async saveSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      await AsyncStorage.multiSet([
        [SESSION_STORAGE_KEY, JSON.stringify({ sessionId: this.currentSession.sessionId, startTime: this.currentSession.startTime })],
        [SESSION_ACTIONS_KEY, JSON.stringify(this.currentSession.actions)],
      ]);
    } catch (error) {
      console.error('Error saving session to AsyncStorage:', error);
    }
  }

  async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, SESSION_ACTIONS_KEY]);
      this.currentSession = null;
    } catch (error) {
      console.error('Error clearing sessions:', error);
    }
  }
}

export const sessionService = new SessionService();
