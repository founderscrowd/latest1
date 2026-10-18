export interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

const CONSENT_KEY = 'cookieConsent';
const CONSENT_VERSION = 'v1';

export const CONSENT_EVENT = 'cookieConsentChanged';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Push a Google Consent Mode v2 update reflecting the current consent state.
 * Maps the app's analytics/marketing booleans to Google's consent categories:
 *  - analytics_storage  <- analytics
 *  - ad_storage         <- marketing
 *  - ad_user_data       <- marketing
 *  - ad_personalization <- marketing
 *
 * This is a pure bridge: it only calls gtag('consent', 'update', ...) when
 * window.gtag exists (the inline head snippet defines it). It does not load
 * any scripts and does not change how consent is stored.
 */
export function pushGoogleConsentUpdate(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  const granted = (b: boolean) => (b ? 'granted' : 'denied');
  window.gtag('consent', 'update', {
    analytics_storage: granted(state.analytics),
    ad_storage: granted(state.marketing),
    ad_user_data: granted(state.marketing),
    ad_personalization: granted(state.marketing),
  });
}

function getDefaultConsent(): ConsentState {
  return {
    essential: true,
    analytics: false,
    marketing: false,
    timestamp: '',
    version: CONSENT_VERSION,
  };
}

export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return getDefaultConsent();
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (!stored) return getDefaultConsent();
    const parsed = JSON.parse(stored) as Partial<ConsentState>;
    return {
      essential: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      timestamp: parsed.timestamp || '',
      version: parsed.version || '',
    };
  } catch {
    return getDefaultConsent();
  }
}

export function setConsent(analytics: boolean, marketing: boolean): void {
  if (typeof window === 'undefined') return;
  const state: ConsentState = {
    essential: true,
    analytics,
    marketing,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  pushGoogleConsentUpdate(state);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent().analytics;
}

export function hasMarketingConsent(): boolean {
  return getConsent().marketing;
}

export function hasConsentRecord(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored) as Partial<ConsentState>;
    if (!parsed.version || parsed.version !== CONSENT_VERSION) return false;
    return true;
  } catch {
    return false;
  }
}

export function revokeConsent(): void {
  setConsent(false, false);
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${document.domain};`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function clearTrackingCookies(): void {
  const cookies = [
    '_ga', '_gid', '_gat', '_gcl_au',
    '_fbp', '_fbc', 'fr',
    'ttclid', 'ttps',
  ];
  cookies.forEach(clearCookie);
}
