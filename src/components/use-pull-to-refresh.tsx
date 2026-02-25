import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeobrutalRefreshIndicator } from './neobrutal-activity-indicator';

export const usePullScrollY = () => {
  const insets = useSafeAreaInsets();
  const pullScrollY = useSharedValue(0);
  const _restingY = useSharedValue<number | null>(null);
  // scrollInsetTop is the full content inset from the scroll view at rest:
  // equals headerHeight on screens with a transparent nav bar, or insets.top otherwise.
  const scrollInsetTop = useSharedValue(insets.top);

  const updatePullScrollY = (contentOffsetY: number) => {
    'worklet';
    if (_restingY.value === null) {
      // A large negative value means contentInset from a transparent nav header.
      // A small negative value means the user is already mid-pull on first event —
      // treat rest as 0 to avoid anchoring to the pull offset.
      const isHeaderInset = contentOffsetY < -20;
      _restingY.value = isHeaderInset ? contentOffsetY : 0;
      if (isHeaderInset) {
        scrollInsetTop.value = -contentOffsetY;
      }
    }
    pullScrollY.value = contentOffsetY - _restingY.value;
  };

  return { pullScrollY, scrollInsetTop, updatePullScrollY };
};

export const usePullRefreshState = (
  onRefresh: () => Promise<unknown> | void,
) => {
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handlePullRefresh = useCallback(async () => {
    if (isPullRefreshing) {
      return;
    }
    setIsPullRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [onRefresh, isPullRefreshing]);

  return { isPullRefreshing, handlePullRefresh };
};

export const usePullToRefresh = ({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) => {
  const { pullScrollY, scrollInsetTop, updatePullScrollY } = usePullScrollY();

  const refreshControl: React.ReactElement<RefreshControlProps> = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="transparent"
        colors={['transparent']}
      />
    ),
    [refreshing, onRefresh],
  );

  const refreshIndicator = (
    <NeobrutalRefreshIndicator
      refreshing={refreshing}
      scrollY={pullScrollY}
      scrollInsetTop={scrollInsetTop}
    />
  );

  return {
    pullScrollY,
    updatePullScrollY,
    refreshControl,
    refreshIndicator,
  };
};
