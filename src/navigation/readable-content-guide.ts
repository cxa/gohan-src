import { useRef, useSyncExternalStore } from 'react';
import {
  Dimensions,
  LayoutAnimation,
  NativeEventEmitter,
  NativeModules,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  Easing,
  makeMutable,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

export type ReadableContentInsets = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
};

const ZERO_INSETS: ReadableContentInsets = { left: 0, top: 0, right: 0, bottom: 0, width: 0 };

// ─── Global store ─────────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
let baseReadableWidth = 0; // 0 = not yet loaded

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => baseReadableWidth;

// Reanimated SharedValue: the left padding (= (windowWidth - baseReadableWidth) / 2).
// Initialized to 24 (iPhone design-system default) so items never flash full-width
// before the native module responds.  On iPad this smoothly animates to the actual
// readable-content-guide inset.  On iPhone Math.max(24, …) keeps it at 24.
const MIN_ITEM_PADDING = 24;
const animLeft = makeMutable(MIN_ITEM_PADDING);

const setBaseWidth = (width: number) => {
  if (width <= 0 || width === baseReadableWidth) return;
  // Animate JS-layout consumers (tab bar etc.) when Dynamic Type changes.
  if (listeners.size > 0 && baseReadableWidth > 0) {
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
  }
  const isOrientationUpdate = baseReadableWidth > 0;
  baseReadableWidth = width;
  const windowWidth = Dimensions.get('window').width;
  const newLeft = Math.max(MIN_ITEM_PADDING, Math.floor((windowWidth - width) / 2));
  if (isOrientationUpdate) {
    // Native module confirmed a different baseReadableWidth after rotation — animate
    // animLeft to the new correct inset so the card adjusts smoothly.
    animLeft.value = withTiming(newLeft, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  } else {
    // First load: Math.max ensures iPhone always gets at least MIN_ITEM_PADDING
    // even if UIKit's readable guide is narrower than our design minimum.
    animLeft.value = newLeft;
  }
  listeners.forEach(l => l());
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

if (Platform.OS === 'ios') {
  const mod = NativeModules.ReadableContentGuideModule as
    | { getReadableContentInsets(): Promise<ReadableContentInsets> }
    | undefined;

  if (mod) {
    const handleInsets = (insets: ReadableContentInsets) => setBaseWidth(insets.width);

    mod.getReadableContentInsets().then(handleInsets).catch(() => {});

    const emitter = new NativeEventEmitter(NativeModules.ReadableContentGuideModule);
    emitter.addListener('readableContentGuideDidChange', handleInsets);

    // When the window dimensions change (device rotation), request fresh insets
    // immediately — the window already has the new dimensions at this point.
    //
    // animLeft is snapped instantly in both directions.  On iPad the readable
    // content width is the same in portrait and landscape (~660 pt), so the card
    // keeps its absolute width while only the surrounding margins change.  The iOS
    // rotation crossfade hides the 1-frame jump in all cases.  setBaseWidth handles
    // a smooth withTiming animation for the rare case where readable width itself
    // changes (e.g. the native module returns a different value after settling).
    Dimensions.addEventListener('change', ({ window }) => {
      if (baseReadableWidth <= 0) return;
      mod.getReadableContentInsets().then(handleInsets).catch(() => {});
      const newLeft = Math.max(MIN_ITEM_PADDING, Math.floor((window.width - baseReadableWidth) / 2));
      animLeft.value = newLeft; // instant — hidden by the iOS rotation crossfade
    });

    setTimeout(() => {
      mod.getReadableContentInsets().then(handleInsets).catch(() => {});
    }, 500);
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns readable-content-guide insets for the current window.
 * For consumers that use plain styles (tab bar, scroll view padding, etc.).
 * Values are 0 on iPhone and non-iOS platforms.
 */
export const useReadableContentInsets = (): ReadableContentInsets => {
  const { width: windowWidth } = useWindowDimensions();
  const base = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Call LayoutAnimation during render, before React commits the new layout,
  // so padding changes (e.g. for the tab bar) animate when orientation changes.
  const prevWindowWidthRef = useRef(windowWidth);
  if (
    Platform.OS === 'ios' &&
    base > 0 &&
    prevWindowWidthRef.current !== windowWidth &&
    Math.abs(windowWidth - prevWindowWidthRef.current) > 50
  ) {
    LayoutAnimation.configureNext({
      duration: 350,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
  }
  prevWindowWidthRef.current = windowWidth;

  if (Platform.OS !== 'ios' || base <= 0) return ZERO_INSETS;

  const left = Math.max(0, Math.floor((windowWidth - base) / 2));
  return { left, top: 0, right: left, bottom: 0, width: base };
};

/**
 * Returns the raw UIKit readable content guide width (0 if not available).
 */
export const useBaseReadableWidth = (): number => {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/**
 * Returns a Reanimated animated style with paddingHorizontal that smoothly
 * tracks the readable content guide inset.
 *
 * Apply this to an Animated.View wrapper around each FlatList item (and its
 * ListHeaderComponent / ListFooterComponent / ListEmptyComponent) to get
 * smooth rotation transitions driven entirely on the UI thread.
 *
 * Returns an empty style on iPhone and non-iOS platforms.
 */
export const useReadableContentAnimatedItemStyle = () => {
  return useAnimatedStyle(() => {
    if (Platform.OS !== 'ios') return {};
    // animLeft starts at MIN_ITEM_PADDING (24) so items are never full-width on
    // first render.  On iPad it animates to the readable-content-guide inset once
    // the native module responds; on iPhone it stays at MIN_ITEM_PADDING.
    return { paddingHorizontal: animLeft.value };
  });
};
