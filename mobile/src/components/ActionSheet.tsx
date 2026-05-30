import React, { useCallback, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ActionSheetAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type ActionSheetProps = {
  visible: boolean;
  title?: string;
  actions: ActionSheetAction[];
  onDismiss: () => void;
};

export default function ActionSheet({
  visible,
  title,
  actions,
  onDismiss,
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(600);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = 600;
      overlayOpacity.value = 0;
      translateY.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });
      overlayOpacity.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
    }
  }, [visible, translateY, overlayOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const dismiss = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.ease) });
    translateY.value = withTiming(600, { duration: 120, easing: Easing.in(Easing.ease) }, () => {
      runOnJS(onDismiss)();
    });
  }, [onDismiss, translateY, overlayOpacity]);

  const handleAction = useCallback(
    (action: ActionSheetAction) => {
      const { onPress } = action;
      overlayOpacity.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.ease) });
      translateY.value = withTiming(600, { duration: 120, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(onPress)();
        runOnJS(onDismiss)();
      });
    },
    [onDismiss, translateY, overlayOpacity],
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.overlayBg, overlayStyle]} />
        <Pressable style={styles.overlay} onPress={dismiss} />
        <Animated.View style={sheetStyle}>
          <View style={styles.actionsCard}>
            {title !== undefined && (
              <View style={styles.titleRow}>
                <Text style={styles.titleText}>{title}</Text>
              </View>
            )}
            {actions.map((action, index) => (
              <React.Fragment key={index}>
                {(index > 0 || title !== undefined) && (
                  <View style={styles.divider} />
                )}
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => handleAction(action)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.actionText,
                      action.destructive === true && styles.destructiveText,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
  },
  actionRow: {
    height: 57,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 17,
    color: '#000000',
  },
  destructiveText: {
    color: '#1C1C1E',
  },
});
