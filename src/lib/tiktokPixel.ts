import { hasMarketingConsent, CONSENT_EVENT, clearTrackingCookies } from './cookieConsent';

declare global {
  interface Window {
    ttq?: {
      track: (...args: unknown[]) => void;
      page: (...args: unknown[]) => void;
      load: (...args: unknown[]) => void;
      disableCookie?: (...args: unknown[]) => void;
    };
    TiktokAnalyticsObject?: string;
  }
}

const PIXEL_ID = 'DB5TKL3C77UBL2TM2PQG';

let loaded = false;

export function loadTikTokPixel(): void {
  if (typeof window === 'undefined' || loaded) return;
  if (!hasMarketingConsent()) return;

  const w = window as unknown as Record<string, unknown>;
  const t = 'ttq';
  w.TiktokAnalyticsObject = t;

  const ttq: unknown[] = (w[t] as unknown[]) || [];
  w[t] = ttq;

  const methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
  (ttq as Record<string, unknown>).setAndDefer = function (obj: unknown, method: string) {
    (obj as Record<string, (...args: unknown[]) => void>)[method] = function (...args: unknown[]) {
      (obj as unknown[]).push([method].concat(Array.prototype.slice.call(args, 0)));
    };
  };
  for (let i = 0; i < methods.length; i++) {
    (ttq as Record<string, unknown>).setAndDefer(ttq, methods[i]);
  }
  (ttq as Record<string, unknown>).instance = function (id: string) {
    const e = (ttq as Record<string, unknown[]>)._i?.[id] || [];
    for (let n = 0; n < methods.length; n++) {
      (ttq as Record<string, unknown>).setAndDefer(e, methods[n]);
    }
    return e;
  };
  (ttq as Record<string, unknown>).load = function (e: string, n?: unknown) {
    const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
    (ttq as Record<string, unknown[]>)._i = (ttq as Record<string, unknown[]>)._i || {};
    (ttq as Record<string, unknown[]>)._i[e] = [];
    (ttq as Record<string, unknown[]>)._i[e]._u = i;
    (ttq as Record<string, unknown>)['_t'] = (ttq as Record<string, unknown>)['_t'] || {};
    (ttq as Record<string, unknown>)['_t'][e] = +new Date();
    (ttq as Record<string, unknown>)['_o'] = (ttq as Record<string, unknown>)['_o'] || {};
    (ttq as Record<string, unknown>)['_o'][e] = n || {};
    const o = document.createElement('script');
    o.type = 'text/javascript';
    o.async = true;
    o.src = i + '?sdkid=' + e + '&lib=' + t;
    const a = document.getElementsByTagName('script')[0];
    a.parentNode?.insertBefore(o, a);
  };
  (ttq as Record<string, (...args: unknown[]) => void>).load(PIXEL_ID);
  loaded = true;
}

function ttqTrack(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (!loaded || typeof window.ttq === 'undefined') return;
  if (!hasMarketingConsent()) return;
  if (data) {
    window.ttq.track(event, data);
  } else {
    window.ttq.track(event);
  }
}

export function trackTikTokPageView(): void {
  if (typeof window === 'undefined') return;
  if (!loaded || typeof window.ttq === 'undefined') return;
  if (!hasMarketingConsent()) return;
  window.ttq.page();
}

export function trackTikTokViewContent(
  contentId: string,
  contentType: string,
  contentName?: string,
): void {
  ttqTrack('ViewContent', {
    content_id: contentId,
    content_type: contentType,
    content_name: contentName,
  });
}

export function trackTikTokCompleteRegistration(): void {
  ttqTrack('CompleteRegistration');
}

export function trackTikTokJoinGroup(
  groupId: string,
  groupName?: string,
): void {
  ttqTrack('JoinGroup', {
    content_id: groupId,
    content_type: 'group',
    content_name: groupName,
  });
}

export function trackTikTokCreateGroup(
  groupId: string,
  groupName?: string,
): void {
  ttqTrack('CreateGroup', {
    content_id: groupId,
    content_type: 'group',
    content_name: groupName,
  });
}

function onConsentChanged(e: Event): void {
  const detail = (e as CustomEvent).detail;
  const marketingGranted = detail?.marketing === true;
  if (marketingGranted) {
    if (!loaded) {
      loadTikTokPixel();
      if (typeof window.ttq !== 'undefined' && hasMarketingConsent()) {
        window.ttq.page();
      }
    }
  } else {
    if (typeof window.ttq !== 'undefined' && typeof window.ttq.disableCookie === 'function') {
      window.ttq.disableCookie();
    }
    clearTrackingCookies();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_EVENT, onConsentChanged);
}

export { PIXEL_ID };
