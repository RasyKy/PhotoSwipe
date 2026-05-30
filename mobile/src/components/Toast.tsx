import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export type ToastVariant = 'success' | 'error' | 'warning';

export interface ToastProps {
  variant: ToastVariant;
  title: string;
  subtitle?: string;
  visible: boolean;
}

export function Toast({ variant, title, subtitle, visible }: ToastProps) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(20, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <View style={styles.card}>
        <Ionicons
          name={
            variant === 'success'
              ? 'checkmark-circle'
              : variant === 'warning'
              ? 'alert-circle'
              : 'close-circle'
          }
          size={24}
          color={
            variant === 'success'
              ? '#34C759'
              : variant === 'warning'
              ? '#FF9500'
              : '#FF3B30'
          }
        />
        <View style={styles.textContent}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
}

interface ToastState {
  variant: ToastVariant;
  title: string;
  subtitle?: string;
  visible: boolean;
}

export function useToast() {
  const [toastState, setToastState] = useState<ToastState>({
    variant: 'success',
    title: '',
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (variant: ToastVariant, title: string, subtitle?: string) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    setToastState({ variant, title, subtitle, visible: true });
    timerRef.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  return { showToast, toastProps: toastState };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
});
