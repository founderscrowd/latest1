import { hasMarketingConsent } from './cookieConsent';
import { ensureGoogleTagLoaded, configureGoogleAdsIfNeeded } from './googleAnalytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Ads conversion configuration for the "Sign-up (1)" conversion.
const GOOGLE_ADS_CONVERSION_ID = 'AW-18519986766';
const GOOGLE_ADS_CONVERSION_LABEL = '5LPaCJT7hqEdEM6kgv9E';
const CONVERSION_VALUE = 1.0;
const CONVERSION_CURRENCY = 'GBP';

// Cross-session deduplication: persists per-user so a given registered user
// only ever triggers one Google Ads conversion, even across browser sessions,
// OAuth redirects, email verification callbacks, or React re-renders.
const DEDUP_KEY_PREFIX = 'googleAdsConversionSent:';

function getDedupKey(userId: string): string {
  return `${DEDUP_KEY_PREFIX}${userId}`;
}

function hasAlreadyConverted(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getDedupKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markConverted(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getDedupKey(userId), '1');
  } catch {
    /* storage unavailable */
  }
}

/**
 * Fire the Google Ads "Sign-up (1)" conversion for a confirmed new user
 * registration.
 *
 * Safety guarantees:
 *  - Only fires when Supabase has confirmed a new user profile was created
 *    (caller responsibility: pass the user id from the new-user path).
 *  - Marketing consent must be granted (ad_storage). No consent -> no event.
 *  - Deduplicated per user id in localStorage, so the same registered user is
 *    never counted twice across sessions, refreshes, OAuth callbacks, or
 *    email verification redirects.
 *  - The conversion is only marked as sent AFTER the gtag call has been
 *    dispatched, so a failed dispatch (no tag, no consent) stays unrecorded
 *    and can retry on a later valid state.
 *  - No email, phone, or personal data is sent. Only the static conversion
 *    id/label, value, and currency.
 */
export function trackGoogleAdsConversion(userId: string): void {
  if (typeof window === 'undefined') return;
  if (!userId) return;

  if (hasAlreadyConverted(userId)) return;

  if (!hasMarketingConsent()) return;

  if (!ensureGoogleTagLoaded()) return;
  if (typeof window.gtag !== 'function') return;

  configureGoogleAdsIfNeeded();
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'conversion', {
    send_to: `${GOOGLE_ADS_CONVERSION_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
    value: CONVERSION_VALUE,
    currency: CONVERSION_CURRENCY,
  });

  markConverted(userId);
}

export const GOOGLE_ADS_CONVERSION_ID_PUBLIC = GOOGLE_ADS_CONVERSION_ID;
