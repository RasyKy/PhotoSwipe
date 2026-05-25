import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
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
import { formatFileSize } from '../../utils/fileSize';

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
        translateX.value = withTiming(
          goRight ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5,
          { duration: 350 },
          () => {
            runOnJS(goRight ? onSwipeRight : onSwipeLeft)();
          },
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
          <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />

          <Animated.View style={[styles.label, styles.keepLabel, keepLabelStyle]}>
            <Text style={[styles.labelText, styles.keepText]}>KEEP</Text>
          </Animated.View>

          <Animated.View style={[styles.label, styles.deleteLabel, deleteLabelStyle]}>
            <Text style={[styles.labelText, styles.deleteText]}>DELETE</Text>
          </Animated.View>

          <View style={styles.infoBar}>
            <Text style={styles.filename} numberOfLines={1} ellipsizeMode="middle">
              {photo.filename}
            </Text>
            <Text style={styles.fileSize}>{formatFileSize(photo.fileSize)}</Text>
          </View>
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
    height: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
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
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
  },
  keepText: {
    color: '#34c759',
  },
  deleteText: {
    color: '#ff3b30',
  },
  infoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  filename: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 10,
  },
  fileSize: {
    color: '#cccccc',
    fontSize: 12,
  },
});

export default SwipeCard;
