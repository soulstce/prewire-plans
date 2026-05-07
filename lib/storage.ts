import type { AppState } from './types';

const KEY = 'prewire-plans-state';

export function loadState(): AppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[storage] unable to persist state', error);
    }
  }
}

export function stateKey() {
  return KEY;
}
