import { useSyncExternalStore } from 'react';
import type { PhotoViewerOriginRect } from '@/components/photo-viewer-shared-transition';

type PhotoViewerState = {
  visible: boolean;
  photoUrl: string | null;
  originRect: PhotoViewerOriginRect | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let state: PhotoViewerState = { visible: false, photoUrl: null, originRect: null };

const emitChange = () => {
  listeners.forEach(l => l());
};

export const openPhotoViewer = (
  photoUrl: string,
  originRect?: PhotoViewerOriginRect | null,
) => {
  state = { visible: true, photoUrl, originRect: originRect ?? null };
  emitChange();
};

export const closePhotoViewer = () => {
  state = { visible: false, photoUrl: null, originRect: null };
  emitChange();
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export const usePhotoViewerStore = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
