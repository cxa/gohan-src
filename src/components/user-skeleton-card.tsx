import React from 'react';
import { StyleSheet, View } from 'react-native';
import DropShadowBox from '@/components/drop-shadow-box';
import { ShimmerBar } from '@/components/timeline-skeleton-card';
const AVATAR_SIZE = 44;
const UserSkeletonCard = () => {
  // Randomly pick which bar shimmers: 0 = name bar, 1 = description bar
  const shimmerIndex = Math.floor(Math.random() * 2);
  return <DropShadowBox>
      <View className="flex-row gap-3 border-2 border-foreground bg-surface px-4 py-4 dark:border-border">
        <View className="rounded-full bg-surface-secondary" style={styles.avatar} />
        <View className="flex-1 justify-center gap-2">
          <ShimmerBar className="h-3 w-28 bg-surface-secondary" isActive={shimmerIndex === 0} />
          <ShimmerBar className="h-3 w-full bg-surface-secondary" style={styles.descriptionBar} isActive={shimmerIndex === 1} />
        </View>
      </View>
    </DropShadowBox>;
};
const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE
  },
  descriptionBar: {
    opacity: 0.7
  }
});
export default UserSkeletonCard;