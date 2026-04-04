import { useSyncExternalStore } from 'react';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'app.terms-agreement';

type Listener = () => void;

const listeners = new Set<Listener>();
let hasAgreed = false;
let hydrationPromise: Promise<void> | null = null;

const emitChange = () => {
  listeners.forEach(listener => listener());
};

const hydrateTermsAgreement = async () => {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (creds && creds.password === 'agreed') {
      hasAgreed = true;
      emitChange();
    }
  } catch {
    // Ignore hydration failures; user will be prompted again.
  }
};

const ensureHydrated = () => {
  if (!hydrationPromise) {
    hydrationPromise = hydrateTermsAgreement();
  }
};

export const subscribeToTermsAgreement = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getHasAgreedToTermsSnapshot = () => hasAgreed;

export const useHasAgreedToTerms = () =>
  useSyncExternalStore(
    subscribeToTermsAgreement,
    getHasAgreedToTermsSnapshot,
    getHasAgreedToTermsSnapshot,
  );

export const setAgreedToTerms = async () => {
  hasAgreed = true;
  emitChange();
  try {
    await Keychain.setGenericPassword('terms', 'agreed', {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  } catch {
    // Best-effort persistence; in-memory state is already updated.
  }
};

ensureHydrated();
