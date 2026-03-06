import React, { useRef, useState } from 'react';
import { View, useColorScheme, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { requestFanfouAccessToken, resolveAuthAccessTokenIdentity } from '@/auth/fanfou-client';
import { setAuthAccessToken } from '@/auth/auth-session';
import { saveAuthAccessToken } from '@/auth/secure-token-storage';
import AuthActionButton from '@/components/auth-action-button';
import { AUTH_STACK_ROUTE, ROOT_STACK_ROUTE } from '@/navigation/route-names';
import type { LoginStackParamList, RootStackParamList } from '@/navigation/types';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/app-text';

const CALLBACK_URL = 'gohan://authorize_callback';

const LoginView = () => {
  const { t } = useTranslation();
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

  return (
    <View className="flex-1" style={[containerStyle, { backgroundColor: bgColor }]}>
      <View className="flex-1 items-center justify-center px-6 -mt-20 z-10 w-full pointer-events-none">
        
        {/* Main Title Card - Simplified */}
        <View className="w-full max-w-[320px] pointer-events-auto items-center">
          <Text className="text-6xl font-black tracking-widest text-foreground dark:text-foreground uppercase leading-tight text-center mb-10">
            饭
          </Text>
          <Text className="text-xl font-bold text-foreground/80 dark:text-foreground/80 tracking-widest text-center" style={styles.poemText}>
            我生亦何须
          </Text>
          <Text className="mt-4 text-xl font-bold text-foreground/80 dark:text-foreground/80 tracking-widest text-center" style={styles.poemText}>
            一饱万想灭
          </Text>
        </View>

        {/* Error Message */}
        {errorMessage ? (
          <View className="w-full max-w-[320px] pointer-events-auto mt-8">
            <View className="bg-danger px-4 py-3 border-[3px] border-foreground dark:border-border rounded-none">
              <Text className="text-sm text-danger-foreground font-bold text-center tracking-wide">
                ERROR: {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Bottom Actions */}
      <View className="absolute left-0 right-0 w-full px-8 items-center z-20" style={bottomButtonStyle}>
        <View className="w-full max-w-[320px] pointer-events-auto">
          {isSigningIn && (
            <View className="mb-6 items-center">
              <Pressable onPress={handleCancelSignIn} hitSlop={10} className="active:opacity-70">
                <View className="border-b-[3px] border-foreground dark:border-border">
                  <Text className="text-foreground dark:text-foreground text-sm font-black tracking-widest uppercase pb-1">
                    {t('loginCancel')}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          <AuthActionButton
            label={t('loginButton')}
            loadingLabel={t('loginLoading')}
            onPress={handleSignIn}
            isLoading={isSigningIn}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  poemText: {
    fontFamily: 'Huiwen-MinchoGBK-Regular',
  },
});

export default LoginView;
