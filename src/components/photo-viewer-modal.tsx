import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  Modal,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import NeobrutalActivityIndicator from '@/components/neobrutal-activity-indicator';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/app-text';
import { useThemeColor } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPhotoViewerLayerMode } from '@/navigation/photo-viewer-layer-state';
type PhotoViewerModalProps = {
  visible: boolean;
  photoUrl: string | null;
  onClose: () => void;
};
type ImageSize = {
  width: number;
  height: number;
};
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 820;
const EDGE_OVERSCROLL = 24;
const EDGE_RESISTANCE = 0.34;
const PAN_SPRING = {
  stiffness: 680,
  damping: 52,
  mass: 0.42,
  overshootClamping: false,
  energyThreshold: 6e-9,
} as const;
const OPEN_TIMING = {
  duration: 260,
  easing: Easing.bezier(0.22, 0.61, 0.36, 1),
} as const;
const CLOSE_TIMING = {
  duration: 220,
  easing: Easing.out(Easing.quad),
} as const;
const LOADING_FALLBACK_MS = 8000;
const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(max, value));
};
const PhotoViewerModal = ({
  visible,
  photoUrl,
  onClose,
}: PhotoViewerModalProps) => {
  const { t } = useTranslation();
  const [accentForeground] = useThemeColor(['accent-foreground']);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const loadingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseImageSize = (() => {
    if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
      return { width: viewportWidth, height: viewportHeight };
    }
    const scale = Math.min(
      viewportWidth / imageSize.width,
      viewportHeight / imageSize.height,
    );
    return {
      width: Math.max(1, imageSize.width * scale),
      height: Math.max(1, imageSize.height * scale),
    };
  })();
  const baseWidth = useSharedValue(baseImageSize.width);
  const baseHeight = useSharedValue(baseImageSize.height);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const presentationScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);
  const isDismissing = useSharedValue(false);
  useEffect(() => {
    baseWidth.value = baseImageSize.width;
    baseHeight.value = baseImageSize.height;
  }, [baseHeight, baseImageSize.height, baseImageSize.width, baseWidth]);
  const markImageLoaded = () => {
    if (loadingFallbackRef.current) {
      clearTimeout(loadingFallbackRef.current);
      loadingFallbackRef.current = null;
    }
    setIsImageLoading(false);
  };
  useEffect(() => {
    if (!visible || !photoUrl) {
      if (loadingFallbackRef.current) {
        clearTimeout(loadingFallbackRef.current);
        loadingFallbackRef.current = null;
      }
      return;
    }
    setImageSize(null);
    setIsImageLoading(true);
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    startScale.value = 1;
    startTranslateX.value = 0;
    startTranslateY.value = 0;
    isDismissing.value = false;
    presentationScale.value = 0.92;
    contentOpacity.value = 0;
    backdropOpacity.value = 0;
    presentationScale.value = withTiming(1, OPEN_TIMING);
    contentOpacity.value = withTiming(1, OPEN_TIMING);
    backdropOpacity.value = withTiming(1, OPEN_TIMING);
    loadingFallbackRef.current = setTimeout(() => {
      setIsImageLoading(false);
      loadingFallbackRef.current = null;
    }, LOADING_FALLBACK_MS);
    let isCancelled = false;
    Image.getSize(
      photoUrl,
      (width, height) => {
        if (!isCancelled) {
          setImageSize({ width, height });
        }
      },
      () => {
        if (!isCancelled) {
          setImageSize(null);
        }
      },
    );
    Image.prefetch(photoUrl)
      .then(() => {
        if (!isCancelled) {
          setIsImageLoading(false);
          if (loadingFallbackRef.current) {
            clearTimeout(loadingFallbackRef.current);
            loadingFallbackRef.current = null;
          }
        }
      })
      .catch(() => undefined);
    return () => {
      isCancelled = true;
      if (loadingFallbackRef.current) {
        clearTimeout(loadingFallbackRef.current);
        loadingFallbackRef.current = null;
      }
    };
  }, [
    backdropOpacity,
    contentOpacity,
    isDismissing,
    photoUrl,
    presentationScale,
    scale,
    startScale,
    startTranslateX,
    startTranslateY,
    translateX,
    translateY,
    visible,
  ]);
  useEffect(() => {
    if (visible && photoUrl) {
      setPhotoViewerLayerMode('viewer-open');
      return () => {
        setPhotoViewerLayerMode('default');
      };
    }
    setPhotoViewerLayerMode('default');
    return;
  }, [photoUrl, visible]);
  const applyEdgeResistance = (value: number, min: number, max: number) => {
    'worklet';
    if (value < min) {
      const overscroll = min - value;
      return min - Math.min(EDGE_OVERSCROLL, overscroll * EDGE_RESISTANCE);
    }
    if (value > max) {
      const overscroll = value - max;
      return max + Math.min(EDGE_OVERSCROLL, overscroll * EDGE_RESISTANCE);
    }
    return value;
  };
  const getPanBounds = (zoomScale: number) => {
    'worklet';
    if (zoomScale <= MIN_SCALE) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    const scaledWidth = baseWidth.value * zoomScale;
    const scaledHeight = baseHeight.value * zoomScale;
    const maxX = Math.max((scaledWidth - viewportWidth) / 2, 0);
    const maxY = Math.max((scaledHeight - viewportHeight) / 2, 0);
    return { minX: -maxX, maxX, minY: -maxY, maxY };
  };
  const startCloseTransition = () => {
    'worklet';
    if (isDismissing.value) {
      return;
    }
    isDismissing.value = true;
    contentOpacity.value = withTiming(0, CLOSE_TIMING);
    presentationScale.value = withTiming(0.88, CLOSE_TIMING);
    backdropOpacity.value = withTiming(0, CLOSE_TIMING, finished => {
      if (finished) {
        scheduleOnRN(onClose);
      }
    });
  };
  useEffect(() => {
    if (!visible) {
      return;
    }
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        scheduleOnUI(startCloseTransition);
        return true;
      },
    );
    return () => backSubscription.remove();
  }, [visible]);
  const snapBack = (currentScale: number) => {
    'worklet';
    const bounds = getPanBounds(currentScale);
    translateX.value = withSpring(
      clamp(translateX.value, bounds.minX, bounds.maxX),
      PAN_SPRING,
    );
    translateY.value = withSpring(
      clamp(translateY.value, bounds.minY, bounds.maxY),
      PAN_SPRING,
    );
  };
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      const nextScale = clamp(startScale.value * event.scale, 0.85, MAX_SCALE);
      const ratio = nextScale / startScale.value;
      const focalX = event.focalX - viewportWidth / 2;
      const focalY = event.focalY - viewportHeight / 2;
      const nextTranslateX =
        startTranslateX.value * ratio + (1 - ratio) * focalX;
      const nextTranslateY =
        startTranslateY.value * ratio + (1 - ratio) * focalY;
      const bounds = getPanBounds(nextScale);
      scale.value = nextScale;
      translateX.value = applyEdgeResistance(
        nextTranslateX,
        bounds.minX,
        bounds.maxX,
      );
      translateY.value = applyEdgeResistance(
        nextTranslateY,
        bounds.minY,
        bounds.maxY,
      );
    })
    .onEnd(() => {
      const targetScale = clamp(scale.value, MIN_SCALE, MAX_SCALE);
      scale.value = withSpring(targetScale, PAN_SPRING);
      if (targetScale <= MIN_SCALE) {
        translateX.value = withSpring(0, PAN_SPRING);
        translateY.value = withSpring(0, PAN_SPRING);
        backdropOpacity.value = withTiming(1, OPEN_TIMING);
        return;
      }
      snapBack(targetScale);
    });
  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .activeOffsetY([-4, 4])
    .minDistance(1)
    .onBegin(() => {
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      if (isDismissing.value) {
        return;
      }
      const isZoomed = scale.value > MIN_SCALE + 0.01;
      if (isZoomed) {
        const bounds = getPanBounds(scale.value);
        translateX.value = applyEdgeResistance(
          startTranslateX.value + event.translationX,
          bounds.minX,
          bounds.maxX,
        );
        translateY.value = applyEdgeResistance(
          startTranslateY.value + event.translationY,
          bounds.minY,
          bounds.maxY,
        );
        backdropOpacity.value = 1;
        return;
      }
      const verticalDrag =
        event.translationY > 0
          ? event.translationY
          : event.translationY * 0.18;
      translateX.value = event.translationX * 0.16;
      translateY.value = verticalDrag;
      backdropOpacity.value = interpolate(
        Math.abs(verticalDrag),
        [0, 220],
        [1, 0.3],
        Extrapolation.CLAMP,
      );
    })
    .onEnd(event => {
      if (isDismissing.value) {
        return;
      }
      const isZoomed = scale.value > MIN_SCALE + 0.01;
      if (isZoomed) {
        const bounds = getPanBounds(scale.value);
        const clampX: [number, number] = [
          bounds.minX - EDGE_OVERSCROLL,
          bounds.maxX + EDGE_OVERSCROLL,
        ];
        const clampY: [number, number] = [
          bounds.minY - EDGE_OVERSCROLL,
          bounds.maxY + EDGE_OVERSCROLL,
        ];
        translateX.value = withDecay(
          {
            velocity: event.velocityX,
            clamp: clampX,
            deceleration: 0.995,
            rubberBandEffect: true,
            rubberBandFactor: 0.72,
          },
          finished => {
            'worklet';
            if (!finished) {
              return;
            }
            const currentBounds = getPanBounds(scale.value);
            translateX.value = withSpring(
              clamp(translateX.value, currentBounds.minX, currentBounds.maxX),
              PAN_SPRING,
            );
          },
        );
        translateY.value = withDecay(
          {
            velocity: event.velocityY,
            clamp: clampY,
            deceleration: 0.995,
            rubberBandEffect: true,
            rubberBandFactor: 0.72,
          },
          finished => {
            'worklet';
            if (!finished) {
              return;
            }
            const currentBounds = getPanBounds(scale.value);
            translateY.value = withSpring(
              clamp(translateY.value, currentBounds.minY, currentBounds.maxY),
              PAN_SPRING,
            );
          },
        );
        return;
      }
      const shouldClose =
        translateY.value > DISMISS_DISTANCE ||
        event.velocityY > DISMISS_VELOCITY ||
        (translateY.value > 56 && event.velocityY > 420);
      if (shouldClose) {
        startCloseTransition();
        return;
      }
      translateX.value = withSpring(0, PAN_SPRING);
      translateY.value = withSpring(0, PAN_SPRING);
      scale.value = withSpring(1, PAN_SPRING);
      backdropOpacity.value = withTiming(1, OPEN_TIMING);
    });
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(240)
    .maxDistance(18)
    .onEnd(event => {
      if (isDismissing.value) {
        return;
      }
      const isZoomed = scale.value > MIN_SCALE + 0.01;
      if (isZoomed) {
        scale.value = withTiming(1, OPEN_TIMING);
        translateX.value = withTiming(0, OPEN_TIMING);
        translateY.value = withTiming(0, OPEN_TIMING);
        backdropOpacity.value = withTiming(1, OPEN_TIMING);
        return;
      }
      const targetScale = DOUBLE_TAP_SCALE;
      const focalX = event.x - viewportWidth / 2;
      const focalY = event.y - viewportHeight / 2;
      const ratio = targetScale / scale.value;
      const nextTranslateX = translateX.value * ratio + (1 - ratio) * focalX;
      const nextTranslateY = translateY.value * ratio + (1 - ratio) * focalY;
      const bounds = getPanBounds(targetScale);
      scale.value = withTiming(targetScale, OPEN_TIMING);
      translateX.value = withTiming(
        clamp(nextTranslateX, bounds.minX, bounds.maxX),
        OPEN_TIMING,
      );
      translateY.value = withTiming(
        clamp(nextTranslateY, bounds.minY, bounds.maxY),
        OPEN_TIMING,
      );
      backdropOpacity.value = withTiming(1, OPEN_TIMING);
    });
  const closeTapGesture = Gesture.Tap()
    .maxDuration(500)
    .onEnd(startCloseTransition);
  const gesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const presentationStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: presentationScale.value }],
  }));
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    width: baseWidth.value,
    height: baseHeight.value,
  }));
  const closeControlStyle = useAnimatedStyle(() => ({
    opacity: isDismissing.value ? 0 : 1,
  }));
  const imageTransformStyle = useAnimatedStyle(() => {
    const dismissScale =
      scale.value <= MIN_SCALE + 0.01
        ? interpolate(
            Math.abs(translateY.value),
            [0, 280],
            [1, 0.84],
            Extrapolation.CLAMP,
          )
        : 1;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value * dismissScale },
      ],
    };
  });
  if (!photoUrl || !visible) {
    return null;
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => scheduleOnUI(startCloseTransition)}
    >
      <View className="flex-1">
        <GestureDetector gesture={gesture}>
          <View className="absolute inset-0">
            <Animated.View
              className="absolute inset-0 bg-foreground/70 dark:bg-background/85"
              style={backdropStyle}
            />
            <View
              className="flex-1 items-center justify-center"
              pointerEvents="box-none"
            >
              <Animated.View style={presentationStyle}>
                <Animated.View style={imageTransformStyle}>
                  <Animated.Image
                    source={{ uri: photoUrl }}
                    style={imageAnimatedStyle}
                    resizeMode="contain"
                    onLoad={markImageLoaded}
                    onError={markImageLoaded}
                    onLoadEnd={markImageLoaded}
                  />
                </Animated.View>
              </Animated.View>
            </View>
          </View>
        </GestureDetector>
        {isImageLoading ? (
          <View
            className="absolute inset-0 items-center justify-center"
            pointerEvents="none"
          >
            <NeobrutalActivityIndicator size="small" color={accentForeground} />
          </View>
        ) : null}
        <Animated.View
          className="absolute right-4"
          style={[{ top: Math.max(insets.top + 8, 16) }, closeControlStyle]}
        >
          <GestureDetector gesture={closeTapGesture}>
            <View
              className="rounded-3xl border border-border/50 bg-background/70 px-3 py-2"
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('photoViewerCloseA11y')}
            >
              <Text allowFontScaling className="text-foreground">
                {t('photoViewerClose')}
              </Text>
            </View>
          </GestureDetector>
        </Animated.View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  closeButton: {
    borderCurve: 'continuous',
  },
});
export default PhotoViewerModal;
