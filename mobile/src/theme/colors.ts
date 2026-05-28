export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  border: '#DCE1EA',
  text: '#121826',
  textSecondary: '#4B5565',
  textMuted: '#768097',
  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  overlay: 'rgba(18, 24, 38, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0B1020',
  surface: '#121A2B',
  surfaceElevated: '#182138',
  card: '#182138',
  border: '#243049',
  text: '#F5F7FB',
  textSecondary: '#C1CAD8',
  textMuted: '#8D98AB',
  primary: '#60A5FA',
  primarySoft: '#1E3A8A',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  overlay: 'rgba(5, 9, 18, 0.62)',
};

export const themeColors = {
  light: lightColors,
  dark: darkColors,
} as const;

export type ThemeMode = keyof typeof themeColors;