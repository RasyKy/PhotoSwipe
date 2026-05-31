export type ThemeColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  separator: string;
  primary: string;
  success: string;
  danger: string;
  warning: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
};

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  separator: '#C6C6C8',
  primary: '#007AFF',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  tabBar: '#FFFFFF',
  tabBarBorder: '#C6C6C8',
  tabBarActive: '#007AFF',
  tabBarInactive: '#8E8E93',
};

export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  separator: '#38383A',
  primary: '#0A84FF',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
  tabBar: '#1C1C1E',
  tabBarBorder: '#38383A',
  tabBarActive: '#0A84FF',
  tabBarInactive: '#636366',
};

export const themeColors = {
  light: lightColors,
  dark: darkColors,
} as const;

export type ThemeMode = keyof typeof themeColors;
