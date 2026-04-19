import React from 'react';
import { View } from 'react-native';

export type DropShadowBoxType =
  | 'default'
  | 'danger'
  | 'warning'
  | 'success'
  | 'accent'
  | 'sky';

/** Rotate through pastel card backgrounds for visual variety in lists.
 * Punchy cool-first alternation: mint opens fresh, then warm/cool beats
 * trade off so adjacent cards always contrast hard while scrolling. */
export const CARD_PASTEL_CYCLE: DropShadowBoxType[] = [
  'success',  // mint   — cool green, fresh opener
  'accent',   // coral  — warm red
  'sky',      // sky    — cool blue
  'warning',  // apricot — warm yellow
  'danger',   // lilac  — cool purple
];

/** Light-mode pastel card background colors indexed by shadow type */
// Each hue has its own personality — widen the hue spread (coral / apricot /
// lilac / crisp sky / spring mint) and push saturation so they stop reading
// as "five slightly different warm pastels" and start reading as five
// distinct flavors. Slight lightness variance adds rhythm when scrolling.
export const CARD_BG_LIGHT: Record<DropShadowBoxType, string> = {
  default: '#F7EFE0',
  accent:  '#F6D6CB', // coral — desaturated from #FFD6CA so large cards don't glare on white
  warning: '#FFECBA', // apricot — warm but dialed back from the full orange push
  danger:  '#E3CAEF', // lilac — clearer purple than the old gray-lavender
  sky:     '#BCDDEC', // crisper sky, quieter than the saturated blue
  success: '#B5E0CA', // mint — fresher than before, not neon
};

/** Dark-mode card background colors indexed by shadow type */
// Match the light palette hue-for-hue at dark-friendly lightness — each card
// should still read as coral / apricot / lilac / sky / mint, just muted.
export const CARD_BG_DARK: Record<DropShadowBoxType, string> = {
  default: '#2A2520',
  accent:  '#5A2E23',
  warning: '#4A3618',
  danger:  '#3D2048',
  sky:     '#1A3E5A',
  success: '#1A4538',
};

/** Slightly deeper tint of each card bg — used for skeleton shimmer bars,
 * chips, and any decorative surface that should sit one step darker than
 * the card background while staying in the same hue family. */
export const CARD_BAR_LIGHT: Record<DropShadowBoxType, string> = {
  default: '#EAD9C0',
  accent:  '#F5C4B8',
  warning: '#F5E298',
  danger:  '#CCBAEC',
  sky:     '#A8D0EC',
  success: '#9ED6CC',
};

/** Dark-mode variant of CARD_BAR_LIGHT. */
export const CARD_BAR_DARK: Record<DropShadowBoxType, string> = {
  default: '#3A3028',
  accent:  '#5A3830',
  warning: '#4A4020',
  danger:  '#402850',
  sky:     '#203A50',
  success: '#1E4840',
};

/** Neutral fallback bar tint used when a card has no pastel bg to derive
 * from (e.g. plain-theme skeletons). Translucent so it reads on any surface. */
export const SKELETON_BAR_FALLBACK_LIGHT = 'rgba(0,0,0,0.08)';
export const SKELETON_BAR_FALLBACK_DARK = 'rgba(255,255,255,0.12)';

type DropShadowBoxProps = {
  children: React.ReactNode;
  containerClassName?: string;
};

const DropShadowBox = ({
  children,
  containerClassName,
}: DropShadowBoxProps) => (
  <View
    className={`rounded-3xl shadow-card dark:shadow-none ${containerClassName ?? ''}`}
  >
    {children}
  </View>
);

export default DropShadowBox;
