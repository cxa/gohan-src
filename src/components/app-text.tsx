import React from 'react';
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { $ } from '@cxa/twx';

type ClassNameProp = { className?: string };
type AnimatedClassName = string | SharedValue<string | undefined> | undefined;
const IOS_DEFAULT_DYNAMIC_TYPE_RAMP: NonNullable<TextProps['dynamicTypeRamp']> =
  'body';

const withFont = (className?: string) => $('font-sans', className);
const withFontAnimated = (className?: AnimatedClassName) =>
  typeof className === 'string' || className === undefined
    ? $('font-sans', className)
    : className;

const Text = React.forwardRef<
  React.ComponentRef<typeof RNText>,
  TextProps & ClassNameProp
>(
  (
    {
      className,
      allowFontScaling = true,
      dynamicTypeRamp,
      maxFontSizeMultiplier,
      ...props
    },
    ref,
  ) => (
    <RNText
      ref={ref}
      {...props}
      allowFontScaling={allowFontScaling}
      dynamicTypeRamp={
        Platform.OS === 'ios'
          ? dynamicTypeRamp ?? IOS_DEFAULT_DYNAMIC_TYPE_RAMP
          : dynamicTypeRamp
      }
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={withFont(className)}
    />
  ),
);

Text.displayName = 'AppText';

const TextInput = React.forwardRef<
  React.ComponentRef<typeof RNTextInput>,
  TextInputProps & ClassNameProp
>(({ className, allowFontScaling = true, ...props }, ref) => (
  <RNTextInput
    ref={ref}
    {...props}
    allowFontScaling={allowFontScaling}
    className={withFont(className)}
  />
));
TextInput.displayName = 'AppTextInput';

type AnimatedTextProps = React.ComponentProps<typeof Animated.Text>;
const AnimatedText = React.forwardRef<
  React.ComponentRef<typeof Animated.Text>,
  AnimatedTextProps
>(
  (
    {
      className,
      allowFontScaling = true,
      dynamicTypeRamp,
      maxFontSizeMultiplier,
      ...props
    },
    ref,
  ) => (
    <Animated.Text
      ref={ref}
      {...props}
      allowFontScaling={allowFontScaling}
      dynamicTypeRamp={
        Platform.OS === 'ios'
          ? dynamicTypeRamp ?? IOS_DEFAULT_DYNAMIC_TYPE_RAMP
          : dynamicTypeRamp
      }
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={withFontAnimated(className)}
    />
  ),
);
AnimatedText.displayName = 'AppAnimatedText';

const AnimatedTextInputBase = Animated.createAnimatedComponent(RNTextInput);
type AnimatedTextInputProps = React.ComponentProps<
  typeof AnimatedTextInputBase
> &
  ClassNameProp;
const AnimatedTextInput = React.forwardRef<
  React.ComponentRef<typeof RNTextInput>,
  AnimatedTextInputProps
>(({ className, allowFontScaling = true, ...props }, ref) => (
  <AnimatedTextInputBase
    ref={ref}
    {...props}
    allowFontScaling={allowFontScaling}
    className={withFontAnimated(className)}
  />
));
AnimatedTextInput.displayName = 'AppAnimatedTextInput';

export { Text, TextInput, AnimatedText, AnimatedTextInput };
