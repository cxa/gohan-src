import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

type NeobrutalActivityIndicatorProps = {
  color?: string;
  size?: 'small' | 'default';
  animate?: boolean;
};

const BLOCK_COUNT = 3;
const STAGGER_MS = 150;
const BOUNCE_UP = -6;
const BOUNCE_DURATION = 300;
const PAUSE_DURATION = 100;

const BLOCK_SIZES = {
  small: 8,
  default: 10,
} as const;

const BouncingBlock = ({
  index,
  blockSize,
  fillColor,
  borderColor,
  animate,
}: {
  index: number;
  blockSize: number;
  fillColor: string;
  borderColor: string;
  animate: boolean;
}) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      translateY.value = withDelay(
        index * STAGGER_MS,
        withRepeat(
          withSequence(
            withTiming(BOUNCE_UP, {
              duration: BOUNCE_DURATION,
              easing: Easing.out(Easing.cubic),
            }),
            withTiming(0, {
              duration: BOUNCE_DURATION,
              easing: Easing.in(Easing.cubic),
            }),
            withTiming(0, { duration: PAUSE_DURATION }),
          ),
          -1,
        ),
      );
    } else {
      translateY.value = withTiming(0, { duration: 120 });
    }
  }, [animate, index, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width: blockSize,
          height: blockSize,
          backgroundColor: fillColor,
          borderColor,
        },
        animatedStyle,
      ]}
    />
  );
};

const NeobrutalActivityIndicator = ({
  color,
  size = 'default',
  animate = true,
}: NeobrutalActivityIndicatorProps) => {
  const [accent, foreground, border] = useThemeColor([
    'accent',
    'foreground',
    'border',
  ]);
  const fillColor = color ?? accent;
  const borderColor = foreground ?? border;
  const blockSize = BLOCK_SIZES[size];

  return (
    <View style={styles.container}>
      {Array.from({ length: BLOCK_COUNT }).map((_, i) => (
        <BouncingBlock
          key={i}
          index={i}
          blockSize={blockSize}
          fillColor={fillColor}
          borderColor={borderColor}
          animate={animate}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  block: {
    borderWidth: 2,
  },
  refreshContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
});

const REFRESH_TOP_MARGIN = 16;
const DEFAULT_PULL_THRESHOLD = 80;
export const COMPACT_PULL_THRESHOLD = 50;
const BLOCK_BORDER = 2;

const RefreshDot = ({
  index,
  blockSize,
  fillColor,
  borderColor,
  scrollY,
  refreshing,
  pullThreshold,
}: {
  index: number;
  blockSize: number;
  fillColor: string;
  borderColor: string;
  scrollY: SharedValue<number>;
  refreshing: boolean;
  pullThreshold: number;
}) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      translateY.value = withDelay(
        index * STAGGER_MS,
        withRepeat(
          withSequence(
            withTiming(BOUNCE_UP, {
              duration: BOUNCE_DURATION,
              easing: Easing.out(Easing.cubic),
            }),
            withTiming(0, {
              duration: BOUNCE_DURATION,
              easing: Easing.in(Easing.cubic),
            }),
            withTiming(0, { duration: PAUSE_DURATION }),
          ),
          -1,
        ),
      );
    } else {
      translateY.value = withTiming(0, { duration: 120 });
    }
  }, [refreshing, index, translateY]);

  // Each dot appears in its own zone of the pull range
  const zoneSize = pullThreshold / BLOCK_COUNT;
  const dotStart = index * zoneSize;       // when this dot starts appearing
  const dotEnd = (index + 1) * zoneSize;   // when this dot is fully visible

  const animatedStyle = useAnimatedStyle(() => {
    if (refreshing) {
      return {
        opacity: 1,
        transform: [{ translateY: translateY.value }, { scale: 1 }],
      };
    }

    // Map pull offset to per-dot opacity and scale
    const pullAmount = -scrollY.value;
    const dotVisibility = interpolate(
      pullAmount,
      [dotStart, dotEnd],
      [0, 1],
      Extrapolation.CLAMP,
    );

    // "Ready to release" signal: gentle bounce when past threshold
    const readyBounce = interpolate(
      pullAmount,
      [pullThreshold, pullThreshold + 20],
      [0, BOUNCE_UP * 0.5],
      Extrapolation.CLAMP,
    );

    return {
      opacity: dotVisibility,
      transform: [
        { translateY: readyBounce },
        { scale: 0.5 + dotVisibility * 0.5 },
      ],
    };
  }, [refreshing, index, pullThreshold, zoneSize, dotStart, dotEnd]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width: blockSize,
          height: blockSize,
          backgroundColor: fillColor,
          borderColor,
        },
        animatedStyle,
      ]}
    />
  );
};

export const NeobrutalRefreshIndicator = ({
  refreshing,
  scrollY,
  scrollInsetTop,
  pullThreshold = DEFAULT_PULL_THRESHOLD,
}: {
  refreshing: boolean;
  scrollY: SharedValue<number>;
  scrollInsetTop: SharedValue<number>;
  pullThreshold?: number;
}) => {
  const [accent, foreground, border] = useThemeColor([
    'accent',
    'foreground',
    'border',
  ]);
  const fillColor = accent;
  const borderColor = foreground ?? border;
  const refreshBlockSize = BLOCK_SIZES.small + BLOCK_BORDER * 2;
  const refreshLock = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      refreshLock.value = 1;
    } else {
      refreshLock.value = withDelay(
        150,
        withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }),
      );
    }
  }, [refreshing, refreshLock]);

  const animatedStyle = useAnimatedStyle(() => {
    const pullProgress = interpolate(
      scrollY.value,
      [-pullThreshold, 0],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const visible = Math.max(pullProgress, refreshLock.value);

    // scrollInsetTop = full header height (status bar + nav bar) when a transparent
    // nav header is present, or ≈ safeAreaTop when there is no nav header.
    // Place dots just below the nav bar (or status bar when no nav bar).
    const sit = scrollInsetTop.value;
    const top = sit + REFRESH_TOP_MARGIN;

    return {
      opacity: visible,
      top,
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    const pullOffset = interpolate(
      scrollY.value,
      [-pullThreshold, 0],
      [0, -refreshBlockSize],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY: refreshing ? 0 : pullOffset }],
    };
  }, [refreshBlockSize, refreshing]);

  return (
    <Animated.View style={[styles.refreshContainer, animatedStyle]}>
      <Animated.View style={[styles.container, indicatorStyle]}>
        {Array.from({ length: BLOCK_COUNT }).map((_, i) => (
          <RefreshDot
            key={i}
            index={i}
            blockSize={BLOCK_SIZES.small}
            fillColor={fillColor}
            borderColor={borderColor}
            scrollY={scrollY}
            refreshing={refreshing}
            pullThreshold={pullThreshold}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

export default NeobrutalActivityIndicator;
