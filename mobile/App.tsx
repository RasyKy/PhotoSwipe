import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/features/onboarding/OnboardingScreen';

export default function App() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('photoswipe_onboarded').then(value => {
      setHasOnboarded(value !== null);
    });
  }, []);

  if (hasOnboarded === null) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {hasOnboarded ? (
          <AppNavigator />
        ) : (
          <OnboardingScreen onComplete={() => setHasOnboarded(true)} />
        )}
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
