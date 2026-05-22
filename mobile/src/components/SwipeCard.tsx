import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, Image } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { Photo } from '../types/index';
import PhotoCard from './PhotoCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width to trigger swipe
const ROTATION_RANGE = 60; // Max rotation in degrees

interface SwipeCardProps {
  photo: Photo | null;
  onSwipe: (action: 'keep' | 'delete') => void;
  isLoading?: boolean;
  isBackground?: boolean;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ 
  photo, 
  onSwipe, 
  isLoading = false,
  isBackground = false
}) => {
  // Animated values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const cardKey = useRef(0);

  // Reset animations when photo changes
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
    cardKey.current += 1;
  }, [photo?.id, translateX, translateY, rotate]);

  // Pan gesture handler (only if not background)
  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      if (isBackground) return;
    },
    onActive: (event) => {
      if (isBackground) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      rotate.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-ROTATION_RANGE, 0, ROTATION_RANGE],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      if (isBackground) return;
      const swipeVelocity = event.velocityX;
      const absoluteTranslateX = Math.abs(translateX.value);
      const shouldSwipe =
        absoluteTranslateX > SWIPE_THRESHOLD || Math.abs(swipeVelocity) > 500;

      if (shouldSwipe) {
        const action = translateX.value > 0 ? 'keep' : 'delete';
        const swipeDirection = action === 'keep' ? 1 : -1;

        translateX.value = withTiming(swipeDirection * SCREEN_WIDTH * 1.5, {
          duration: 400,
        });
        rotate.value = withTiming(
          swipeDirection * (ROTATION_RANGE + 20),
          { duration: 400 },
          () => {
            runOnJS(onSwipe)(action);
          }
        );
      } else {
        translateX.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    },
  });

  // Animated styles for card
  const animatedCardStyle = useAnimatedStyle(() => {
    if (isBackground) {
      return {
        transform: [{ scale: 0.95 }, { translateY: 10 }],
        opacity: 0.8,
        zIndex: -1,
      };
    }
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
      ],
      zIndex: 1,
    };
  });

  // Animated style for KEEP overlay (green)
  const keepOverlayOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  // Animated style for DELETE overlay (red)
  const deleteOverlayOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateX.value,
        [0, -SWIPE_THRESHOLD],
        [0, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.container, animatedCardStyle]} key={cardKey.current}>
        {/* Photo Card */}
        <PhotoCard photo={photo} isLoading={isLoading} />

        {/* KEEP Overlay (Green) */}
        <Animated.View style={[styles.overlay, styles.keepOverlay, keepOverlayOpacity]}>
          <Text style={styles.overlayText}>KEEP</Text>
        </Animated.View>

        {/* DELETE Overlay (Red) */}
        <Animated.View style={[styles.overlay, styles.deleteOverlay, deleteOverlayOpacity]}>
          <Text style={styles.overlayText}>DELETE</Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  keepOverlay: {
    backgroundColor: 'rgba(52, 199, 89, 0.7)',
  },
  deleteOverlay: {
    backgroundColor: 'rgba(255, 59, 48, 0.7)',
  },
  overlayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
});

export default SwipeCard;
