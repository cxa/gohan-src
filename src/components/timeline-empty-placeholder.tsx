import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/app-text';
import type { LucideIcon } from 'lucide-react-native';
import { useThemeColor } from 'heroui-native';

type TimelineEmptyPlaceholderProps = {
  icon: LucideIcon;
  message: string;
};

const TimelineEmptyPlaceholder = ({
  icon: Icon,
  message,
}: TimelineEmptyPlaceholderProps) => {
  const [muted] = useThemeColor(['muted']);
  const { height } = useWindowDimensions();

  return (
    <View
      className="items-center justify-center"
      style={{ minHeight: height * 0.55 }}
    >
      <Icon size={48} color={muted} strokeWidth={1.5} />
      <Text className="mt-4 text-[15px] text-muted">{message}</Text>
    </View>
  );
};

export default TimelineEmptyPlaceholder;
