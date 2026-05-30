import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useSwipeStore } from '../store/swipeStore';

const SETTINGS_STORAGE_KEY = 'photoswipe-settings';
const SESSION_STORAGE_KEY = 'photoswipe_session';
const SESSION_ACTIONS_KEY = 'photoswipe_session_actions';
const USER_ID_STORAGE_KEY = 'photoswipe_user_id';
const DEVICE_ID_STORAGE_KEY = 'photoswipe_device_id';

type SettingsState = {
  darkMode: boolean;
  hapticEnabled: boolean;
  backupEnabled: boolean;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  setHapticEnabled: (enabled: boolean) => void;
  toggleHapticEnabled: () => void;
  setBackupEnabled: (enabled: boolean) => void;
  toggleBackupEnabled: () => void;
  resetSettings: () => void;
  clearAllData: () => Promise<void>;
};

const initialState = {
  darkMode: false,
  hapticEnabled: true,
  backupEnabled: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      toggleHapticEnabled: () =>
        set((state) => ({ hapticEnabled: !state.hapticEnabled })),
      setBackupEnabled: (enabled) => set({ backupEnabled: enabled }),
      toggleBackupEnabled: () =>
        set((state) => ({ backupEnabled: !state.backupEnabled })),
      resetSettings: () => set(initialState),
      clearAllData: async () => {
        useSwipeStore.getState().reset();
        set(initialState);

        await AsyncStorage.multiRemove([
          SETTINGS_STORAGE_KEY,
          SESSION_STORAGE_KEY,
          SESSION_ACTIONS_KEY,
          USER_ID_STORAGE_KEY,
          DEVICE_ID_STORAGE_KEY,
        ]);
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        darkMode: state.darkMode,
        hapticEnabled: state.hapticEnabled,
        backupEnabled: state.backupEnabled,
      }),
    }
  )
);

export type { SettingsState };