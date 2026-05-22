import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import api from './api';
import { SwipeAction } from '../types/index';

const SESSION_STORAGE_KEY = 'photoswipe_session';
const SESSION_ACTIONS_KEY = 'photoswipe_session_actions';

interface SessionState {
  sessionId: string;
  startTime: number;
  actions: SwipeAction[];
}

class SessionService {
  private currentSession: SessionState | null = null;

  /**
   * Initialize or resume a session
   */
  async initializeSession(): Promise<string> {
    try {
      // Try to load existing session
      const savedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      const savedActions = await AsyncStorage.getItem(SESSION_ACTIONS_KEY);

      if (savedSession && savedActions) {
        this.currentSession = JSON.parse(savedSession);
        this.currentSession.actions = JSON.parse(savedActions);
        console.log('Resumed session:', this.currentSession.sessionId);
        return this.currentSession.sessionId;
      }

      // Create new session
      const response = await api.createSession();

      if (!response.success || !response.data) {
        throw new Error('Failed to create session');
      }

      this.currentSession = {
        sessionId: response.data.sessionId,
        startTime: Date.now(),
        actions: [],
      };

      // Save to AsyncStorage
      await this.saveSession();
      console.log('Created new session:', this.currentSession.sessionId);

      return this.currentSession.sessionId;
    } catch (error) {
      console.error('Error initializing session:', error);
      // Fallback: create a local session
      this.currentSession = {
        sessionId: `local-${Date.now()}`,
        startTime: Date.now(),
        actions: [],
      };
      return this.currentSession.sessionId;
    }
  }

  /**
   * Record a swipe action
   */
  async recordSwipe(photoId: string, action: 'keep' | 'delete'): Promise<boolean> {
    if (!this.currentSession) {
      console.error('No active session');
      return false;
    }

    try {
      const swipeAction: SwipeAction = {
        photoId,
        action,
        timestamp: Date.now(),
      };

      // Record to API
      const response = await api.recordSwipe(
        this.currentSession.sessionId,
        photoId,
        action
      );

      if (!response.success) {
        console.warn('API recordSwipe returned false, but continuing locally');
      }

      // Add to local session
      this.currentSession.actions.push(swipeAction);

      // Save to AsyncStorage
      await this.saveSession();

      // Haptic feedback
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

  /**
   * Undo the last swipe
   */
  async undoSwipe(): Promise<boolean> {
    if (!this.currentSession || this.currentSession.actions.length === 0) {
      console.error('No actions to undo');
      return false;
    }

    let lastAction: SwipeAction | undefined;
    try {
      lastAction = this.currentSession.actions.pop();
      if (!lastAction) {
        return false;
      }

      // Record undo to API
      const response = await api.undoSwipe(
        this.currentSession.sessionId,
        lastAction.photoId
      );

      if (!response.success) {
        console.warn('API undoSwipe returned false, but continuing locally');
      }

      // Save to AsyncStorage
      await this.saveSession();

      // Haptic feedback
      await Haptics.selectionAsync();

      return true;
    } catch (error) {
      console.error('Error undoing swipe:', error);
      // Re-add the action since the undo failed
      if (lastAction) {
        this.currentSession.actions.push(lastAction);
      }
      return false;
    }
  }

  /**
   * End the current session
   */
  async endSession(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const response = await api.endSession(this.currentSession.sessionId);

      if (!response.success) {
        console.warn('API endSession returned false');
      }

      // Clear from AsyncStorage
      await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, SESSION_ACTIONS_KEY]);

      this.currentSession = null;
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  /**
   * Get all actions in current session
   */
  getActions(): SwipeAction[] {
    return this.currentSession?.actions || [];
  }

  /**
   * Save session to AsyncStorage
   */
  private async saveSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      await AsyncStorage.multiSet([
        [SESSION_STORAGE_KEY, JSON.stringify({
          sessionId: this.currentSession.sessionId,
          startTime: this.currentSession.startTime,
        })],
        [SESSION_ACTIONS_KEY, JSON.stringify(this.currentSession.actions)],
      ]);
    } catch (error) {
      console.error('Error saving session to AsyncStorage:', error);
    }
  }

  /**
   * Clear all stored sessions (for testing/debugging)
   */
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
