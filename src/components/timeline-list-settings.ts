import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

export const TIMELINE_TAB_BAR_HEIGHT = 44;
export const TIMELINE_SPACING = 32;
export const TIMELINE_HORIZONTAL_PADDING = 24;

type TimelineContentStyle = ViewStyle & { gap?: number };

export type TimelineListSettings = {
  contentContainerStyle: TimelineContentStyle;
  scrollIndicatorInsets: { bottom: number };
  scrollEventThrottle: number;
};

export const useTimelineListSettings = (
  insets: EdgeInsets,
): TimelineListSettings =>
  useMemo(
    () => ({
      contentContainerStyle: {
        paddingHorizontal: TIMELINE_HORIZONTAL_PADDING,
        paddingTop: insets.top,
        paddingBottom:
          TIMELINE_TAB_BAR_HEIGHT + insets.bottom + TIMELINE_SPACING,
        gap: TIMELINE_SPACING,
      },
      scrollIndicatorInsets: {
        bottom: TIMELINE_TAB_BAR_HEIGHT,
      },
      scrollEventThrottle: 16,
    }),
    [insets.bottom, insets.top],
  );
