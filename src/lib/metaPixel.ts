import { hasMarketingConsent, CONSENT_EVENT, clearTrackingCookies } from './cookieConsent';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID = '1614166306981071';

let loaded = false;

export function loadMetaPixel(): void {
  if (typeof window === 'undefined' || loaded) return;
  if (!hasMarketingConsent()) return;

  (function (f: Window & typeof globalThis, b: Document, e: string, v: string) {
    const n: any = (f as any).fbq;
    if (n) {
      return;
    }
    const fbqFn: any = function (...args: unknown[]) {
      if (fbqFn.callMethod) {
        fbqFn.callMethod.apply(fbqFn, args);
      } else {
        fbqFn.queue.push(args);
      }
    };
    (f as any).fbq = fbqFn;
    fbqFn.push = fbqFn;
    fbqFn.loaded = true;
    fbqFn.version = '2.0';
    fbqFn.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  if (typeof window.fbq === 'function') {
    window.fbq('init', PIXEL_ID);
  }
  loaded = true;
}

function fbq(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  if (!loaded || typeof window.fbq !== 'function') return;
  if (!hasMarketingConsent()) return;
  window.fbq(...args);
}

export function trackPageView(): void {
  fbq('track', 'PageView');
}

export function trackCompleteRegistration(): void {
  fbq('track', 'CompleteRegistration');
}

export function trackLogin(): void {
  fbq('track', 'Login');
}

export function trackInitiateCheckout(): void {
  fbq('track', 'InitiateCheckout');
}

export function trackPurchase(value: number, currency: string = 'USD'): void {
  fbq('track', 'Purchase', { value, currency });
}

function onConsentChanged(e: Event): void {
  const detail = (e as CustomEvent).detail;
  const marketingGranted = detail?.marketing === true;
  if (marketingGranted) {
    if (!loaded) {
      loadMetaPixel();
      if (typeof window.fbq === 'function' && hasMarketingConsent()) {
        window.fbq('track', 'PageView');
      }
    }
  } else {
    clearTrackingCookies();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_EVENT, onConsentChanged);
}
