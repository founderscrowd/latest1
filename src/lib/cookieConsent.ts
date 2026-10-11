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
