import { getConsent, hasAnalyticsConsent, CONSENT_EVENT, clearTrackingCookies } from './cookieConsent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    googleAnalyticsLoaded?: boolean;
  }
}

const GA_ID = 'G-MJF82NJCD6';

// Tracks whether the gtag.js library script + gtag function have been bootstrapped.
let tagLoaded = false;
// Tracks whether GA4 (G-MJF82NJCD6) has been configured for page_view collection.
let gaConfigured = false;

/**
 * Bootstrap the shared gtag.js library (window.gtag + dataLayer + script tag).
 *
 * This is the single source of truth for loading the Google tag. It is safe to
 * call from analytics code and from Google Ads conversion code. It only loads
 * the gtag library script once and never injects a second script tag.
 *
 * Returns true when window.gtag is callable, false otherwise (e.g. no consent,
 * no window).
 */
export function ensureGoogleTagLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  if (tagLoaded && typeof window.gtag === 'function') return true;

  // Only bootstrap the tag when the user has granted at least analytics or
  // marketing consent. Without any consent the tag must not load.
  const consent = getConsent();
  if (!consent.analytics && !consent.marketing) return false;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]): void {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;

  if (!tagLoaded) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    window.gtag('js', new Date());
    tagLoaded = true;
  }

  return typeof window.gtag === 'function';
}

/**
 * Configure GA4 (G-MJF82NJCD6) for page_view collection.
 * Only runs once and only when analytics consent has been granted.
 */
function configureGA4IfNeeded(): void {
  if (gaConfigured) return;
  if (!hasAnalyticsConsent()) return;
  if (!ensureGoogleTagLoaded()) return;
  window.gtag!('config', GA_ID);
  gaConfigured = true;
}

/**
 * Load Google Analytics. Kept for backwards compatibility with existing
 * callers (App.tsx, consent change handler). Internally delegates to
 * ensureGoogleTagLoaded + configureGA4IfNeeded.
 */
export function loadGoogleAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;
  if (ensureGoogleTagLoaded()) {
    configureGA4IfNeeded();
  }
}

export function trackPageView(path: string): void {
  trackEvent('page_view', { page_path: path });
}

export function trackEvent(
  eventName: string,
  parameters: Record<string, unknown> = {},
): void {
  if (!hasAnalyticsConsent()) return;
  if (!ensureGoogleTagLoaded()) return;
  if (typeof window.gtag !== 'function') return;
  configureGA4IfNeeded();
  window.gtag('event', eventName, parameters);
}

function onConsentChanged(e: Event): void {
  const detail = (e as CustomEvent).detail;
  const analyticsGranted = detail?.analytics === true;
  if (analyticsGranted) {
    if (!tagLoaded) {
      loadGoogleAnalytics();
    } else {
      configureGA4IfNeeded();
    }
    if (gaConfigured) {
      trackPageView(window.location.pathname + window.location.search);
    }
  } else {
    // Analytics revoked: stop GA4 collection but leave the shared tag loaded if
    // marketing consent still exists (Google Ads conversions may still fire).
    gaConfigured = false;
    if (!getConsent().marketing) {
      clearTrackingCookies();
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_EVENT, onConsentChanged);
}
