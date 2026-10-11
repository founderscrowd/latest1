import { hasAnalyticsConsent, CONSENT_EVENT, clearTrackingCookies } from './cookieConsent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    googleAnalyticsLoaded?: boolean;
  }
}

const GA_ID = 'G-MJF82NJCD6';

let loaded = false;

export function loadGoogleAnalytics(): void {
  if (typeof window === 'undefined' || loaded) return;
  if (!hasAnalyticsConsent()) return;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]): void {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  loaded = true;
}

export function trackPageView(path: string): void {
  if (!loaded || !hasAnalyticsConsent()) return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', { page_path: path });
}

function onConsentChanged(e: Event): void {
  const detail = (e as CustomEvent).detail;
  const analyticsGranted = detail?.analytics === true;
  if (analyticsGranted) {
    if (!loaded) loadGoogleAnalytics();
    trackPageView(window.location.pathname + window.location.search);
  } else {
    if (loaded) clearTrackingCookies();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_EVENT, onConsentChanged);
}
