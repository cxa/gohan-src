import React from 'react';
import { Pressable, View } from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useThemeColor } from 'heroui-native';
import { Home, AtSign, MoreHorizontal, Plus } from 'lucide-react-native';

import { useAuthSession } from '@/auth/auth-session';
import LoginView from '@/components/login-view';
import TimelineSkeletonCard from '@/components/timeline-skeleton-card';
import type { AuthTabParamList } from '@/navigation/types';
import AuthHomeRoute from '@/routes/_auth.home/index';
import MentionsRoute from '@/routes/_auth.mentions/index';
import MoreRoute from '@/routes/_auth.more/index';

const Tab = createBottomTabNavigator<AuthTabParamList>();

const PlaceholderScreen = ({ title }: { title: string }) => {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <View className="flex-1 px-5 py-6">
        <View className="gap-8">
          <TimelineSkeletonCard
            message={`${title} is getting ready.`}
            lineCount={2}
          />
          {Array.from({ length: 5 }).map((_, index) => (
            <TimelineSkeletonCard
              key={`placeholder-${index}`}
              lineCount={index % 2 === 0 ? 2 : 3}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const isTabRouteName = (
  routeName: string,
): routeName is keyof AuthTabParamList =>
  routeName === 'Home' ||
  routeName === 'Mentions' ||
  routeName === 'Compose' ||
  routeName === 'More';

const iconForRoute = (routeName: keyof AuthTabParamList, color: string) => {
  switch (routeName) {
    case 'Home':
      return <Home color={color} size={24} />;
    case 'Mentions':
      return <AtSign color={color} size={24} />;
    case 'More':
      return <MoreHorizontal color={color} size={24} />;
    case 'Compose':
      return <Plus color={color} size={24} />;
    default:
      return null;
  }
};

const renderAuthTabBar = (props: BottomTabBarProps) => (
  <AuthTabBar {...props} />
);

const ComposePlaceholder = () => <PlaceholderScreen title="Compose" />;

const AuthTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const [accent, muted, accentForeground] = useThemeColor([
    'accent',
    'muted',
    'accent-foreground',
  ]);

  const composeIndex = state.routes.findIndex(r => r.name === 'Compose');
  const composeRoute = composeIndex !== -1 ? state.routes[composeIndex] : null;
  const mainRoutes = state.routes.filter(r => r.name !== 'Compose');

  const renderItem = (
    route: BottomTabBarProps['state']['routes'][number],
    isLast: boolean,
    isBlock: boolean,
  ) => {
    if (!route) return null;
    if (!isTabRouteName(route.name)) {
      return null;
    }
    const { options } = descriptors[route.key];
    const isFocused = state.index === state.routes.indexOf(route);
    const backgroundColor = isFocused ? accent : 'transparent';
    const iconColor = isFocused ? accentForeground : muted;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={onPress}
        onLongPress={onLongPress}
        className={`items-center justify-center border-foreground dark:border-border ${
          isBlock ? 'flex-1' : 'w-full'
        } ${!isLast && isBlock ? 'border-r-2' : ''}`}
        style={{
          backgroundColor,
          height: 44 + Math.max(insets.bottom, 0), // Reduced base height
        }}
      >
        {iconForRoute(route.name, iconColor)}
      </Pressable>
    );
  };

  return (
    <View className="absolute left-0 right-0 bottom-0 flex-row bg-transparent">
      {/* Main Tabs Block */}
      <View className="flex-1 flex-row border-2 border-b-0 border-l-0 bg-surface border-foreground dark:border-border">
        {mainRoutes.map((route, index) =>
          renderItem(route, index === mainRoutes.length - 1, true),
        )}
      </View>

      {/* Gap */}
      <View className="w-4" />

      {/* Compose Button Block */}
      {composeRoute ? (
        <View className="w-20 border-2 border-b-0 border-r-0 bg-surface border-foreground dark:border-border">
          {renderItem(composeRoute, true, false)}
        </View>
      ) : null}
    </View>
  );
};

const AuthIndexRoute = () => {
  const auth = useAuthSession();
  const [backgroundColor] = useThemeColor(['background']);

  if (auth.status !== 'authenticated') {
    return <LoginView />;
  }

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor } }}
      tabBar={renderAuthTabBar}
    >
      <Tab.Screen name="Home" component={AuthHomeRoute} />
      <Tab.Screen name="Mentions" component={MentionsRoute} />
      <Tab.Screen name="Compose" component={ComposePlaceholder} />
      <Tab.Screen name="More" component={MoreRoute} />
    </Tab.Navigator>
  );
};

export default AuthIndexRoute;
