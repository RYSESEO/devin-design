// Layout persistence via localStorage + server sync
import { isAuthenticated } from './auth.js';
import { syncToServer } from './state-sync.js';

const STORAGE_KEY = 'ryse-layout';

/**
 * Save layout state to localStorage and sync to server if authenticated
 * @param {Array<{id: string, section: string, order: number, colSpan: number, rowSpan: number}>} layout
 */
export function saveLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (e) {
    // Quota exceeded or private mode - silently fail
  }

  // Sync to server when authenticated
  if (isAuthenticated()) {
    syncToServer('layout', layout);
  }
}

/**
 * Load layout state from localStorage
 * @returns {Array|null}
 */
export function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Reset layout - remove from localStorage
 */
export function resetLayout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
