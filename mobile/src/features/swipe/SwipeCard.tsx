import React, { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Photo } from '../../types/index';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;
const SWIPE_VELOCITY_THRESHOLD = 800;
const MAX_ROTATION_DEG = 15;

interface SwipeCardProps {
  photo: Photo;
  nextPhoto?: Photo;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ photo, nextPhoto, onSwipeLeft, onSwipeRight }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [imageError, setImageError] = useState(false);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      const pastThreshold = Math.abs(translateX.value) > SWIPE_THRESHOLD;
      const fastFlick =
        event.velocityX > SWIPE_VELOCITY_THRESHOLD ||
        event.velocityX < -SWIPE_VELOCITY_THRESHOLD;

      if (pastThreshold || fastFlick) {
        const goRight = translateX.value > 0 || event.velocityX > 0;
        runOnJS(goRight ? onSwipeRight : onSwipeLeft)();
        translateX.value = withTiming(
          goRight ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5,
          { duration: 250 },
        );
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const frontCardStyle = useAnimatedStyle(() => {
    'worklet';
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const keepLabelStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  const deleteLabelStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(
        translateX.value,
        [0, -SWIPE_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  const backCardStyle = useAnimatedStyle(() => {
    'worklet';
    const progress = Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1);
    return {
      transform: [
        { scale: interpolate(progress, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
        { translateY: interpolate(progress, [0, 1], [12, 0], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(progress, [0, 1], [0.6, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={styles.root}>
      {nextPhoto && (
        <Animated.View style={[styles.card, styles.backCard, backCardStyle]}>
          <Image source={{ uri: nextPhoto.uri }} style={styles.image} resizeMode="cover" />
        </Animated.View>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, styles.frontCard, frontCardStyle]}>
          {imageError ? (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#C7C7CC" />
            </View>
          ) : (
            <Image
              source={{ uri: photo.uri }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          )}

          {photo.isScreenshot && (
            <View style={styles.screenshotBadge}>
              <Text style={styles.screenshotBadgeText}>Screenshot</Text>
            </View>
          )}

          <Animated.View style={[styles.label, styles.keepLabel, keepLabelStyle]}>
            <Text style={[styles.labelText, styles.keepText]}>KEEP</Text>
          </Animated.View>

          <Animated.View style={[styles.label, styles.deleteLabel, deleteLabelStyle]}>
            <Text style={[styles.labelText, styles.deleteText]}>DELETE</Text>
          </Animated.View>


        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: '92%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  frontCard: {
    zIndex: 2,
  },
  backCard: {
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 3,
  },
  keepLabel: {
    left: 20,
    borderColor: '#34c759',
    transform: [{ rotate: '-15deg' }],
  },
  deleteLabel: {
    right: 20,
    borderColor: '#ff3b30',
    transform: [{ rotate: '15deg' }],
  },
  labelText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  keepText: {
    color: '#34c759',
  },
  deleteText: {
    color: '#ff3b30',
  },
  screenshotBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  screenshotBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default SwipeCard;
