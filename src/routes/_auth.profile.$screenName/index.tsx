import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Surface } from 'heroui-native';
import { useQuery } from '@tanstack/react-query';

import { get } from '@/auth/fanfou-client';
import type {
  AuthProfileScreenParamList,
  AuthStackParamList,
} from '@/navigation/types';
import { parseHtmlToText } from '@/utils/parse-html';
import type { FanfouUser } from '@/types/fanfou';
import { Text } from '@/components/app-text';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFanfouUser = (value: unknown): value is FanfouUser => isRecord(value);

const ProfileRoute = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
  const route =
    useRoute<
      RouteProp<
        AuthProfileScreenParamList,
        'route_root._auth.profile._screenName.index'
      >
    >();
  const screenName = route.params?.screenName;
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<FanfouUser | null>({
    queryKey: ['profile', screenName],
    queryFn: async () => {
      const data = await get('/users/show', { id: screenName });
      return isFanfouUser(data) ? data : null;
    },
    enabled: Boolean(screenName),
  });

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : 'Failed to load profile.'
    : null;

  const displayName = user?.name || user?.screen_name || screenName || 'User';
  const handleName = user?.screen_name ? `@${user.screen_name}` : '';
  const description = user?.description
    ? parseHtmlToText(user.description)
    : '';
  const stats = [
    { label: 'Posts', value: user?.statuses_count },
    { label: 'Following', value: user?.friends_count },
    { label: 'Followers', value: user?.followers_count },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <View className="flex-row items-center px-4 py-3">
        <Button variant="ghost" size="sm" onPress={() => navigation.goBack()}>
          Back
        </Button>
        <View className="flex-1 items-center">
          <Text className="text-[14px] text-foreground">Profile</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.contentContainer}
      >
        <Surface className="rounded-3xl bg-surface px-5 py-6">
          <View className="items-center gap-3">
            {user?.profile_image_url_large ? (
              <Image
                source={{ uri: user.profile_image_url_large }}
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-full bg-surface-secondary">
                <Text className="text-[20px] text-muted">
                  {displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="items-center gap-1">
              <Text className="text-[20px] text-foreground">{displayName}</Text>
              {handleName ? (
                <Text className="text-[13px] text-muted">{handleName}</Text>
              ) : null}
            </View>
            {user?.location ? (
              <Text className="text-[13px] text-muted">{user.location}</Text>
            ) : null}
            {user?.url ? (
              <Text className="text-[13px] text-muted">{user.url}</Text>
            ) : null}
          </View>
        </Surface>

        <View className="mt-4 flex-row gap-3">
          {stats.map(stat => (
            <Surface
              key={stat.label}
              className="flex-1 rounded-2xl bg-surface-secondary px-3 py-4"
            >
              <Text className="text-[16px] text-foreground">
                {stat.value ?? '--'}
              </Text>
              <Text className="text-[12px] text-muted">{stat.label}</Text>
            </Surface>
          ))}
        </View>

        <View className="mt-4 gap-3">
          {isLoading ? (
            <Surface className="rounded-2xl bg-surface-secondary px-4 py-6">
              <Text className="text-[14px] text-muted">Loading profile...</Text>
            </Surface>
          ) : null}
          {errorMessage ? (
            <Surface className="rounded-2xl bg-danger-soft px-4 py-4">
              <Text className="text-[13px] text-danger-foreground">
                {errorMessage}
              </Text>
            </Surface>
          ) : null}
          {description && !isLoading ? (
            <Surface className="rounded-2xl bg-surface-secondary px-4 py-4">
              <Text className="text-[14px] leading-5 text-foreground">
                {description}
              </Text>
            </Surface>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});

export default ProfileRoute;
