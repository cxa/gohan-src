import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/app-text';
import { $ } from '@cxa/twx';

type AuthActionVariant = 'primary' | 'danger';

type AuthActionButtonProps = {
  label: string;
  loadingLabel?: string;
  isLoading?: boolean;
  variant?: AuthActionVariant;
  onPress: () => void;
};

const backgroundClassMap: Record<AuthActionVariant, string> = {
  primary: 'bg-accent',
  danger: 'bg-danger',
};

const labelClassMap: Record<AuthActionVariant, string> = {
  primary: 'text-accent-foreground',
  danger: 'text-danger-foreground',
};

const AuthActionButton = ({
  label,
  loadingLabel,
  isLoading = false,
  variant = 'primary',
  onPress,
}: AuthActionButtonProps) => {
  const text = isLoading ? loadingLabel ?? label : label;

  return (
    <View className="w-full relative">
      <View className="absolute left-0 top-0 h-full w-full bg-foreground dark:bg-border -translate-x-1.5 translate-y-1.5" />
      <Pressable
        onPress={onPress}
        disabled={isLoading}
        className={`w-full ${
          backgroundClassMap[variant]
        } border-2 border-foreground dark:border-border h-14 items-center justify-center active:translate-x-[-3px] active:translate-y-[3px] ${
          isLoading ? 'opacity-70' : ''
        }`}
      >
        <Text className={$('text-[16px] font-bold', labelClassMap[variant])}>
          {text}
        </Text>
      </Pressable>
    </View>
  );
};

export default AuthActionButton;
