import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { Uniwind } from 'uniwind';

export const APP_UI_STYLE_OPTION = {
  SOFT: 'soft',
  SHARP: 'sharp',
} as const;

export type AppUiStyleOption =
  (typeof APP_UI_STYLE_OPTION)[keyof typeof APP_UI_STYLE_OPTION];

export const APP_UI_STYLE_OPTIONS = [
  { value: APP_UI_STYLE_OPTION.SOFT, label: 'Soft' },
  { value: APP_UI_STYLE_OPTION.SHARP, label: 'Sharp' },
] as const;

// 0.5rem × 16px/rem — matches global.css default --radius
const SOFT_RADIUS = 8;
const SHARP_RADIUS = 0;

const SERVICE = 'app.ui-style-preference';

type Listener = () => void;

const listeners = new Set<Listener>();
let appUiStylePreference: AppUiStyleOption = APP_UI_STYLE_OPTION.SOFT;
let hydrationPromise: Promise<void> | null = null;

const emitChange = () => {
  listeners.forEach(listener => listener());
};

const applyUiStyleRadius = (style: AppUiStyleOption) => {
  const radius = style === APP_UI_STYLE_OPTION.SHARP ? SHARP_RADIUS : SOFT_RADIUS;
  Uniwind.updateCSSVariables('light', { '--radius': radius });
  Uniwind.updateCSSVariables('dark', { '--radius': radius });
};

const setAppUiStyleSnapshot = (next: AppUiStyleOption) => {
  if (appUiStylePreference === next) {
    return;
  }
  appUiStylePreference = next;
  applyUiStyleRadius(next);
  emitChange();
};

const parseAppUiStylePreference = (
  value?: string | null,
): AppUiStyleOption | null => {
  if (value === APP_UI_STYLE_OPTION.SOFT) return APP_UI_STYLE_OPTION.SOFT;
  if (value === APP_UI_STYLE_OPTION.SHARP) return APP_UI_STYLE_OPTION.SHARP;
  return null;
};

const hydrateAppUiStylePreference = async () => {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    const parsed = parseAppUiStylePreference(creds ? creds.password : null);
    if (!parsed) {
      return;
    }
    setAppUiStyleSnapshot(parsed);
  } catch {
    // Ignore hydration failures and keep default.
  }
};

const ensureHydrated = () => {
  if (!hydrationPromise) {
    hydrationPromise = hydrateAppUiStylePreference();
  }
};

export const subscribeToAppUiStylePreference = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAppUiStylePreferenceSnapshot = () => appUiStylePreference;

export const useAppUiStylePreference = () =>
  useSyncExternalStore(
    subscribeToAppUiStylePreference,
    getAppUiStylePreferenceSnapshot,
    getAppUiStylePreferenceSnapshot,
  );

/**
 * Returns the system font family override for iOS.
 * Soft mode → SF Pro Rounded (ui-rounded); Sharp mode → no override.
 */
export const useSystemFontFamilyOverride = (): string | undefined => {
  const style = useAppUiStylePreference();
  if (Platform.OS !== 'ios') return undefined;
  return style === APP_UI_STYLE_OPTION.SOFT ? 'ui-rounded' : undefined;
};

export const setAppUiStylePreference = async (next: AppUiStyleOption) => {
  const prev = appUiStylePreference;
  setAppUiStyleSnapshot(next);
  try {
    await Keychain.setGenericPassword('style', next, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  } catch (error) {
    setAppUiStyleSnapshot(prev);
    throw error;
  }
};

ensureHydrated();
