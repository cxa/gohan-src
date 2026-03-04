import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, useColorScheme, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, FadeInDown } from 'react-native-reanimated';
import { requestFanfouAccessToken, resolveAuthAccessTokenIdentity } from '@/auth/fanfou-client';
import { setAuthAccessToken } from '@/auth/auth-session';
import { saveAuthAccessToken } from '@/auth/secure-token-storage';
import AuthActionButton from '@/components/auth-action-button';
import { AUTH_STACK_ROUTE, ROOT_STACK_ROUTE } from '@/navigation/route-names';
import type { LoginStackParamList, RootStackParamList } from '@/navigation/types';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/app-text';
const CALLBACK_URL = 'gohan://authorize_callback';
const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT
} = Dimensions.get('window');
const FlyingBird = ({
  insets: _insets,
}: {
  insets: { top: number; bottom: number; left: number; right: number };
}) => {
  const translateX = useSharedValue(-20);
  const translateY = useSharedValue(SCREEN_HEIGHT * 0.4);
  const wingSway = useSharedValue(0);

  useEffect(() => {
    // Slow, solitary flight across the screen
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH + 50, {
        duration: 35000, // Very slow to emphasize profound quietness
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Subtle up and down motion
    translateY.value = withRepeat(
      withTiming(SCREEN_HEIGHT * 0.35, {
        duration: 12000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    // Wing flapping motion
    wingSway.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [translateX, translateY, wingSway]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        // Slight rotation mimicking flight angle
        { rotateZ: '-10deg' }
      ],
    };
  });

  const wingStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scaleY: 0.6 + wingSway.value * 0.4 }
      ]
    };
  });

  const isDark = useColorScheme() === 'dark';
  const birdColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.7)';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none">
      <Animated.View style={wingStyle}>
        <Svg width="30" height="20" viewBox="0 0 30 20">
          <Path
            d="M0,10 Q5,0 15,10 Q25,0 30,10 Q25,5 15,15 Q5,5 0,10 Z"
            fill={birdColor}
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

const BirdMountainBackground = ({
  insets,
}: {
  insets: { top: number; bottom: number; left: number; right: number };
}) => {
  const isDark = useColorScheme() === 'dark';

  // Ink wash painting aesthetics
  const bgColor = isDark ? '#121212' : '#F5F5F0'; // Dark vs Parchment
  const inkBase = isDark ? '220, 220, 225' : '15, 15, 20';

  // Distant, mid, and close mountains overlapping
  const m1Color = `rgba(${inkBase}, 0.15)`;
  const m2Color = `rgba(${inkBase}, 0.35)`;
  const m3Color = `rgba(${inkBase}, 0.7)`;
  const moonColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(200, 50, 50, 0.15)'; // Red sun/stamp in light mode, pale moon in dark

  // Procedural-like SVG paths for mountains
  return (
    <View className="absolute inset-0" style={{ backgroundColor: bgColor }} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>

        {/* Sun/Moon */}
        <Circle
          cx={SCREEN_WIDTH * 0.75}
          cy={SCREEN_HEIGHT * 0.25}
          r={SCREEN_WIDTH * 0.15}
          fill={moonColor}
        />

        {/* Distant Mountains (Lightest Ink) */}
        <Path
          d={`M0,${SCREEN_HEIGHT * 0.45} C${SCREEN_WIDTH * 0.25},${SCREEN_HEIGHT * 0.35} ${SCREEN_WIDTH * 0.4},${SCREEN_HEIGHT * 0.48} ${SCREEN_WIDTH * 0.6},${SCREEN_HEIGHT * 0.45} C${SCREEN_WIDTH * 0.8},${SCREEN_HEIGHT * 0.42} ${SCREEN_WIDTH * 0.9},${SCREEN_HEIGHT * 0.38} ${SCREEN_WIDTH},${SCREEN_HEIGHT * 0.4} L${SCREEN_WIDTH},${SCREEN_HEIGHT} L0,${SCREEN_HEIGHT} Z`}
          fill={m1Color}
        />

        {/* Mid Mountains (Medium Ink) */}
        <Path
          d={`M-50,${SCREEN_HEIGHT * 0.6} C${SCREEN_WIDTH * 0.1},${SCREEN_HEIGHT * 0.52} ${SCREEN_WIDTH * 0.35},${SCREEN_HEIGHT * 0.58} ${SCREEN_WIDTH * 0.5},${SCREEN_HEIGHT * 0.65} C${SCREEN_WIDTH * 0.75},${SCREEN_HEIGHT * 0.75} ${SCREEN_WIDTH * 0.85},${SCREEN_HEIGHT * 0.55} ${SCREEN_WIDTH + 50},${SCREEN_HEIGHT * 0.6} L${SCREEN_WIDTH + 50},${SCREEN_HEIGHT} L-50,${SCREEN_HEIGHT} Z`}
          fill={m2Color}
        />

        {/* Foreground Mountains/Hills (Darkest Ink) */}
        <Path
          d={`M0,${SCREEN_HEIGHT * 0.75} C${SCREEN_WIDTH * 0.3},${SCREEN_HEIGHT * 0.65} ${SCREEN_WIDTH * 0.5},${SCREEN_HEIGHT * 0.82} ${SCREEN_WIDTH * 0.75},${SCREEN_HEIGHT * 0.8} C${SCREEN_WIDTH * 0.9},${SCREEN_HEIGHT * 0.78} ${SCREEN_WIDTH * 0.95},${SCREEN_HEIGHT * 0.82} ${SCREEN_WIDTH},${SCREEN_HEIGHT * 0.85} L${SCREEN_WIDTH},${SCREEN_HEIGHT} L0,${SCREEN_HEIGHT} Z`}
          fill={m3Color}
        />
      </Svg>

      <FlyingBird insets={insets} />
    </View>
  );
};
// Removed TechnicalAnimation, useGlobePathProps, and GEOMETRY logic.
const LoginView = () => {
  const {
    t
  } = useTranslation();
  const navigation = useNavigation<NavigationProp<LoginStackParamList>>();
  const rootNavigation = navigation.getParent<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const signInAttemptIdRef = useRef(0);
  const handleCancelSignIn = () => {
    signInAttemptIdRef.current += 1;
    setIsSigningIn(false);
    setErrorMessage(null);
  };
  const handleSignIn = async () => {
    if (isSigningIn) {
      return;
    }
    const attemptId = signInAttemptIdRef.current + 1;
    signInAttemptIdRef.current = attemptId;
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      const rawAccessToken = await requestFanfouAccessToken(CALLBACK_URL);
      if (signInAttemptIdRef.current !== attemptId) {
        return;
      }
      const accessToken = await resolveAuthAccessTokenIdentity(rawAccessToken);
      if (signInAttemptIdRef.current !== attemptId) {
        return;
      }
      await saveAuthAccessToken(accessToken);
      if (signInAttemptIdRef.current !== attemptId) {
        return;
      }
      setAuthAccessToken(accessToken);
      if (rootNavigation) {
        rootNavigation.reset({
          index: 0,
          routes: [{
            name: ROOT_STACK_ROUTE.AUTH,
            params: {
              screen: AUTH_STACK_ROUTE.TABS
            }
          }]
        });
      }
    } catch (error) {
      if (signInAttemptIdRef.current !== attemptId) {
        return;
      }
      const message = error instanceof Error ? error.message : t('loginFailed');
      setErrorMessage(message);
    } finally {
      if (signInAttemptIdRef.current === attemptId) {
        setIsSigningIn(false);
      }
    }
  };
  const containerStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom
  };
  const bottomButtonStyle = {
    bottom: insets.bottom + 40
  };
  const isDark = useColorScheme() === 'dark';
  const bgColor = isDark ? '#121212' : '#F5F5F0';

  return <View className="flex-1" style={[containerStyle, { backgroundColor: bgColor }]}>
    <BirdMountainBackground insets={insets} />
    <View className="flex-1 items-center justify-center -mt-10 pointer-events-none">
      {errorMessage ? <View className="absolute top-[65%] bg-red-500/10 px-4 py-3 rounded border border-red-500/20 pointer-events-auto">
        <Text className="text-[12px] text-red-600 font-mono text-center uppercase tracking-wide">
          [ ERROR: {errorMessage} ]
        </Text>
      </View> : null}
    </View>

    {/* Bottom Button Layout */}
    <View className="absolute left-0 right-0 w-full px-8 items-center" style={bottomButtonStyle}>
      <Animated.View entering={FadeInDown.delay(500).duration(800).springify()} className="w-full max-w-[320px] pointer-events-auto">
        {isSigningIn && <Animated.View entering={FadeInDown.duration(300)} className="mb-6 items-center">
          <Pressable onPress={handleCancelSignIn} hitSlop={10} className="opacity-70 active:opacity-100">
            <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">
              {t('loginCancel')}
            </Text>
          </Pressable>
        </Animated.View>}

        <AuthActionButton label={t('loginButton')} loadingLabel={t('loginLoading')} onPress={handleSignIn} isLoading={isSigningIn} />
      </Animated.View>
    </View>
  </View>;
};
export default LoginView;