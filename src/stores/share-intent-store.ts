import { useSyncExternalStore } from 'react';
import type { PickedImage } from '@/utils/pick-image-from-library';

type ShareIntentState = {
  photo: PickedImage | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let state: ShareIntentState = { photo: null };

const emitChange = () => {
  listeners.forEach(l => l());
};

export const setShareIntentPhoto = (photo: PickedImage) => {
  state = { photo };
  emitChange();
};

export const clearShareIntent = () => {
  state = { photo: null };
  emitChange();
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export const useShareIntentStore = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
