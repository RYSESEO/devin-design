// Lazy Panel Initialization System
// Panels only initialize on first interaction, reducing startup cost.

const panelRegistry = new Map();
const initializedPanels = new Set();

/**
 * Register a panel for lazy initialization.
 * @param {string} buttonId - DOM id of the trigger button
 * @param {Function} initFn - Initialization function to call on first click
 */
export function registerPanel(buttonId, initFn) {
  panelRegistry.set(buttonId, initFn);
}

/**
 * Initialize the lazy panel system - attach click listeners to registered buttons.
 * Call this after DOMContentLoaded.
 */
export function initLazyPanels() {
  for (const [buttonId, initFn] of panelRegistry) {
    const btn = document.getElementById(buttonId);
    if (!btn) continue;

    btn.addEventListener('click', () => {
      if (!initializedPanels.has(buttonId)) {
        try {
          const result = initFn();
          // If initFn returns false, treat as not initialized (retry on next click)
          if (result !== false) {
            initializedPanels.add(buttonId);
          }
        } catch {
          // Don't mark as initialized on error - allow retry
        }
      }
    }, { once: false }); // Keep listener for toggle behavior
  }
}

export function isPanelInitialized(buttonId) {
  return initializedPanels.has(buttonId);
}
