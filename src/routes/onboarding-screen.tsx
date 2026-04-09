import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions, type DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from 'heroui-native';
import { Text } from '@/components/app-text';
import {
  APP_APPEARANCE_OPTION,
  useAppAppearancePreference,
  setAppAppearancePreference,
  useEffectiveIsDark,
} from '@/settings/app-appearance-preference';
import {
  APP_THEME_OPTION,
  useAppThemePreference,
  setAppThemePreference,
} from '@/settings/app-theme-preference';
import type { RootStackParamList } from '@/navigation/types';
import { ROOT_STACK_ROUTE } from '@/navigation/route-names';

// ---------------------------------------------------------------------------
// Hardcoded mini-preview colors — bypass theme system so both panels can show
// different modes simultaneously
// ---------------------------------------------------------------------------
const PREVIEW_LIGHT = {
  bg: '#FFFFFF',
  skeleton: '#D4C4A8',
  plain: '#F7EFE0',
  colorful: ['#FDDBD5', '#FDF3C8', '#E8D5F5', '#C8EDE8'] as const,
  label: '#1A1208',
};
const PREVIEW_DARK = {
  bg: '#0E0B07',
  skeleton: '#3A3020',
  plain: '#2A2520',
  colorful: ['#3D2820', '#352E18', '#2D1E38', '#1A3530'] as const,
  label: '#D4C4A8',
};

// Line width configs for each skeleton card (as DimensionValue percentages)
const CARD_LINE_CONFIGS: readonly (readonly DimensionValue[])[] = [
  ['85%', '70%'],
  ['90%', '65%', '75%'],
  ['80%', '60%'],
  ['88%', '72%', '55%'],
];

// ---------------------------------------------------------------------------
// Mini skeleton card — uses className for static layout, inline array for colors
// ---------------------------------------------------------------------------
type MiniCardProps = {
  cardBg: string;
  skeletonColor: string;
  lineWidths: readonly DimensionValue[];
};
const MiniCard = ({ cardBg, skeletonColor, lineWidths }: MiniCardProps) => (
  <View className="rounded-[10px] p-2 mb-[5px]" style={[{ backgroundColor: cardBg }]}>
    <View className="flex-row items-center gap-[5px] mb-[5px]">
      <View className="w-4 h-4 rounded-full" style={[{ backgroundColor: skeletonColor }]} />
      <View className="w-[38%] h-[5px] rounded-[2.5px]" style={[{ backgroundColor: skeletonColor }]} />
    </View>
    {lineWidths.map((w, i) => {
      const mb = i < lineWidths.length - 1 ? 3 : 0;
      return (
        <View
          key={i}
          className="h-1 rounded-sm"
          style={[{ width: w, backgroundColor: skeletonColor, marginBottom: mb }]}
        />
      );
    })}
  </View>
);

// ---------------------------------------------------------------------------
// Mini timeline — renders 4 skeleton cards with explicit per-card colors
// ---------------------------------------------------------------------------
type MiniTimelineProps = {
  bg: string;
  cardBgs: readonly string[];
  skeletonColor: string;
};
const MiniTimeline = ({ bg, cardBgs, skeletonColor }: MiniTimelineProps) => (
  <View className="flex-1 p-2" style={[{ backgroundColor: bg }]}>
    {cardBgs.map((cardBg, i) => (
      <MiniCard
        key={i}
        cardBg={cardBg}
        skeletonColor={skeletonColor}
        lineWidths={CARD_LINE_CONFIGS[i % CARD_LINE_CONFIGS.length]}
      />
    ))}
  </View>
);

// ---------------------------------------------------------------------------
// Option panel — preview + label, highlighted border when selected
// ---------------------------------------------------------------------------
type OptionPanelProps = {
  label: string;
  preview: MiniTimelineProps;
  labelColor: string;
  isSelected: boolean;
  accentColor: string;
  onPress: () => void;
};
const OptionPanel = ({
  label,
  preview,
  labelColor,
  isSelected,
  accentColor,
  onPress,
}: OptionPanelProps) => {
  const borderColor = isSelected ? accentColor : 'transparent';
  return (
    <Pressable
      className="flex-1"
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <View
        className="flex-1 rounded-2xl overflow-hidden border-[2.5px]"
        style={[{ borderColor }]}
      >
        <MiniTimeline {...preview} />
        <View
          className="py-[10px] items-center border-t"
          style={[{
            backgroundColor: preview.bg,
            borderTopColor: `${preview.skeletonColor}50`,
          }]}
        >
          <Text className="text-[13px] font-semibold" style={[{ color: labelColor }]}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// Main onboarding screen
// ---------------------------------------------------------------------------
type Step = 1 | 2;

const OnboardingScreen = () => {
  const [step, setStep] = useState<Step>(1);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const appearance = useAppAppearancePreference();
  const theme = useAppThemePreference();
  const isDark = useEffectiveIsDark();
  const [accent] = useThemeColor(['accent']);

  const goToApp = () =>
    navigation.reset({ index: 0, routes: [{ name: ROOT_STACK_ROUTE.AUTH }] });

  const handleNext = () => (step === 1 ? setStep(2) : goToApp());

  const currentPalette = isDark ? PREVIEW_DARK : PREVIEW_LIGHT;

  const step1Options = [
    {
      value: APP_APPEARANCE_OPTION.LIGHT,
      label: t('onboardingOptionLight'),
      preview: {
        bg: PREVIEW_LIGHT.bg,
        cardBgs: [PREVIEW_LIGHT.plain, PREVIEW_LIGHT.plain, PREVIEW_LIGHT.plain, PREVIEW_LIGHT.plain],
        skeletonColor: PREVIEW_LIGHT.skeleton,
      },
      labelColor: PREVIEW_LIGHT.label,
    },
    {
      value: APP_APPEARANCE_OPTION.DARK,
      label: t('onboardingOptionDark'),
      preview: {
        bg: PREVIEW_DARK.bg,
        cardBgs: [PREVIEW_DARK.plain, PREVIEW_DARK.plain, PREVIEW_DARK.plain, PREVIEW_DARK.plain],
        skeletonColor: PREVIEW_DARK.skeleton,
      },
      labelColor: PREVIEW_DARK.label,
    },
  ] as const;

  const step2Options = [
    {
      value: APP_THEME_OPTION.COLORFUL,
      label: t('onboardingOptionColorful'),
      preview: {
        bg: currentPalette.bg,
        cardBgs: currentPalette.colorful,
        skeletonColor: currentPalette.skeleton,
      },
      labelColor: currentPalette.label,
    },
    {
      value: APP_THEME_OPTION.PLAIN,
      label: t('onboardingOptionPlain'),
      preview: {
        bg: currentPalette.bg,
        cardBgs: [currentPalette.plain, currentPalette.plain, currentPalette.plain, currentPalette.plain],
        skeletonColor: currentPalette.skeleton,
      },
      labelColor: currentPalette.label,
    },
  ] as const;

  const options = step === 1 ? step1Options : step2Options;
  const selectedValue = step === 1 ? appearance : theme;

  const handleSelect = (value: string) => {
    if (step === 1) {
      setAppAppearancePreference(
        value as (typeof APP_APPEARANCE_OPTION)[keyof typeof APP_APPEARANCE_OPTION],
      ).catch(() => {});
    } else {
      setAppThemePreference(
        value as (typeof APP_THEME_OPTION)[keyof typeof APP_THEME_OPTION],
      ).catch(() => {});
    }
  };

  return (
    <View
      className="flex-1 bg-background"
      style={[{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }]}
    >
      {/* Header: step indicator + skip */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-[13px] text-muted">{step} / 2</Text>
        <Pressable onPress={goToApp} hitSlop={12} accessibilityRole="button">
          <Text className="text-[15px] text-muted">{t('onboardingSkip')}</Text>
        </Pressable>
      </View>

      {/* Title */}
      <Text className="px-5 pb-4 text-[22px] font-bold text-foreground">
        {step === 1 ? t('onboardingStepAppearance') : t('onboardingStepTheme')}
      </Text>

      {/* Option panels */}
      <View
        className={`flex-1 gap-3 px-5 ${isLandscape ? 'flex-row' : 'flex-col'}`}
      >
        {options.map(option => (
          <OptionPanel
            key={option.value}
            label={option.label}
            preview={option.preview}
            labelColor={option.labelColor}
            isSelected={selectedValue === option.value}
            accentColor={accent}
            onPress={() => handleSelect(option.value)}
          />
        ))}
      </View>

      {/* Footer: next / done button */}
      <View className="px-5 pb-2 pt-4">
        <Pressable
          onPress={handleNext}
          className="items-center rounded-full bg-accent py-4"
          accessibilityRole="button"
        >
          <Text className="text-[16px] font-bold text-accent-foreground">
            {step === 2 ? t('onboardingDone') : t('onboardingNext')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default OnboardingScreen;
