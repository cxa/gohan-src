import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/app-text';
import { useEffectiveIsDark } from '@/settings/app-appearance-preference';
import {
  CARD_INK_ON_PAPER_STRONG_DARK,
  CARD_INK_ON_PAPER_STRONG_LIGHT,
  PAPER_STOCK_DARK,
  PAPER_STOCK_LIGHT,
  RULED_LINE_INK_DARK,
  RULED_LINE_INK_LIGHT,
} from '@/components/drop-shadow-box';

type ProfileDescriptionPaperProps = {
  description: string;
};

const CARD_STYLE = {
  borderRadius: 4,
  paddingTop: 32,
  transform: [{ rotate: '-0.4deg' }],
} as const;
const TEXT_TOP_PADDING = 32;
const HEADER_RULE_TOP = 28;

const ProfileDescriptionPaper = ({
  description,
}: ProfileDescriptionPaperProps) => {
  const [ruleYs, setRuleYs] = useState<number[]>([]);
  const isDark = useEffectiveIsDark();
  const paperColor = isDark ? PAPER_STOCK_DARK : PAPER_STOCK_LIGHT;
  const headerRuleColor = isDark
    ? CARD_INK_ON_PAPER_STRONG_DARK.accent
    : CARD_INK_ON_PAPER_STRONG_LIGHT.accent;
  const bodyRuleColor = isDark ? RULED_LINE_INK_DARK : RULED_LINE_INK_LIGHT;
  return (
    <View
      className="relative overflow-hidden border border-foreground/10 px-5 pb-6 shadow-card"
      style={[CARD_STYLE, { backgroundColor: paperColor }]}
    >
      <View
        pointerEvents="none"
        className="absolute inset-x-5 h-px"
        style={{ top: HEADER_RULE_TOP, backgroundColor: headerRuleColor }}
      />
      {ruleYs.map((y, i) => (
        <View
          key={i}
          pointerEvents="none"
          className="absolute inset-x-0 h-px"
          style={{ top: TEXT_TOP_PADDING + y, backgroundColor: bodyRuleColor }}
        />
      ))}
      <Text
        className="text-[15px] leading-[34px] text-foreground"
        onTextLayout={e => {
          setRuleYs(
            e.nativeEvent.lines.map(l => Math.round(l.y + l.height) - 1),
          );
        }}
      >
        {description}
      </Text>
    </View>
  );
};

export default ProfileDescriptionPaper;
