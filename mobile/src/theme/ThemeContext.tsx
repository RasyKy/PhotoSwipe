import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { darkColors, lightColors, ThemeColors } from './colors';

type ThemeContextValue = {
  isDarkMode: boolean;
  hapticEnabled: boolean;
  colors: ThemeColors;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  setHapticEnabled: (enabled: boolean) => void;
  toggleHapticEnabled: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const darkMode = useSettingsStore((state) => state.darkMode);
  const hapticEnabled = useSettingsStore((state) => state.hapticEnabled);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const toggleDarkMode = useSettingsStore((state) => state.toggleDarkMode);
  const setHapticEnabled = useSettingsStore((state) => state.setHapticEnabled);
  const toggleHapticEnabled = useSettingsStore(
    (state) => state.toggleHapticEnabled
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDarkMode: darkMode,
      hapticEnabled,
      colors: darkMode ? darkColors : lightColors,
      setDarkMode,
      toggleDarkMode,
      setHapticEnabled,
      toggleHapticEnabled,
    }),
    [
      darkMode,
      hapticEnabled,
      setDarkMode,
      toggleDarkMode,
      setHapticEnabled,
      toggleHapticEnabled,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}