import { useSyncExternalStore } from 'react';
import * as Keychain from 'react-native-keychain';

export const APP_FONT_SIZE_OPTION = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const;

export type AppFontSizeOption =
  (typeof APP_FONT_SIZE_OPTION)[keyof typeof APP_FONT_SIZE_OPTION];

export const APP_FONT_SIZE_OPTIONS = [
  { value: APP_FONT_SIZE_OPTION.XS, label: '极小' },
  { value: APP_FONT_SIZE_OPTION.SM, label: '偏小' },
  { value: APP_FONT_SIZE_OPTION.MD, label: '标准' },
  { value: APP_FONT_SIZE_OPTION.LG, label: '偏大' },
  { value: APP_FONT_SIZE_OPTION.XL, label: '特大' },
] as const;

export const APP_FONT_SIZE_SCALE: Record<AppFontSizeOption, number> = {
  [APP_FONT_SIZE_OPTION.XS]: 0.85,
  [APP_FONT_SIZE_OPTION.SM]: 0.925,
  [APP_FONT_SIZE_OPTION.MD]: 1.0,
  [APP_FONT_SIZE_OPTION.LG]: 1.075,
  [APP_FONT_SIZE_OPTION.XL]: 1.15,
};

const SERVICE = 'app.font-size-preference';

type Listener = () => void;

const listeners = new Set<Listener>();
let appFontSizePreference: AppFontSizeOption = APP_FONT_SIZE_OPTION.MD;
let hydrationPromise: Promise<void> | null = null;

const emitChange = () => {
  listeners.forEach(listener => listener());
};

const setAppFontSizeSnapshot = (next: AppFontSizeOption) => {
  if (appFontSizePreference === next) {
    return;
  }
  appFontSizePreference = next;
  emitChange();
};

const parseAppFontSizePreference = (
  value?: string | null,
): AppFontSizeOption | null => {
  if (!value) {
    return null;
  }
  if (
    value === APP_FONT_SIZE_OPTION.XS ||
    value === APP_FONT_SIZE_OPTION.SM ||
    value === APP_FONT_SIZE_OPTION.MD ||
    value === APP_FONT_SIZE_OPTION.LG ||
    value === APP_FONT_SIZE_OPTION.XL
  ) {
    return value;
  }
  return null;
};

const hydrateAppFontSizePreference = async () => {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    const parsed = parseAppFontSizePreference(creds ? creds.password : null);
    if (!parsed) {
      return;
    }
    setAppFontSizeSnapshot(parsed);
  } catch {
    // Ignore hydration failures and keep default size.
  }
};

const ensureHydrated = () => {
  if (!hydrationPromise) {
    hydrationPromise = hydrateAppFontSizePreference();
  }
};

export const subscribeToAppFontSizePreference = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAppFontSizePreferenceSnapshot = () => appFontSizePreference;

export const useAppFontSizePreference = () =>
  useSyncExternalStore(
    subscribeToAppFontSizePreference,
    getAppFontSizePreferenceSnapshot,
    getAppFontSizePreferenceSnapshot,
  );

export const useAppFontSizeScale = () => {
  const pref = useAppFontSizePreference();
  return APP_FONT_SIZE_SCALE[pref];
};

export const getAppFontSizeScaleSnapshot = () =>
  APP_FONT_SIZE_SCALE[getAppFontSizePreferenceSnapshot()];

export const setAppFontSizePreference = async (next: AppFontSizeOption) => {
  const prev = appFontSizePreference;
  setAppFontSizeSnapshot(next);
  try {
    await Keychain.setGenericPassword('font-size', next, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  } catch (error) {
    setAppFontSizeSnapshot(prev);
    throw error;
  }
};

ensureHydrated();
