/**
 * Mobile navigation toggle module.
 * Handles hamburger menu open/close, outside click, Escape key, and resize.
 */

const MOBILE_BREAKPOINT = 768;

export function initMobileNav() {
  const btn = document.getElementById('mobile-menu-btn');
  const topbar = document.querySelector('.topbar');
  if (!btn || !topbar) return;

  // Set initial aria-expanded state
  btn.setAttribute('aria-expanded', 'false');

  // Toggle mobile nav on hamburger click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = topbar.classList.toggle('mobile-nav-open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  // Close on click outside the topbar
  document.addEventListener('click', (e) => {
    if (topbar.classList.contains('mobile-nav-open') && !topbar.contains(e.target)) {
      topbar.classList.remove('mobile-nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && topbar.classList.contains('mobile-nav-open')) {
      topbar.classList.remove('mobile-nav-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });

  // Close when resized above mobile breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > MOBILE_BREAKPOINT && topbar.classList.contains('mobile-nav-open')) {
      topbar.classList.remove('mobile-nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}
