declare global {
  interface Window {
    ttq?: {
      track: (...args: unknown[]) => void;
      page: (...args: unknown[]) => void;
      load: (...args: unknown[]) => void;
    };
  }
}

const PIXEL_ID = 'DB5TKL3C77UBL2TM2PQG';

const CONSENT_KEY = 'cookieConsent';

function marketingConsentGranted(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage?.getItem(CONSENT_KEY);
  if (!stored) return true;
  try {
    const parsed = JSON.parse(stored) as { marketing?: boolean };
    return parsed.marketing !== false;
  } catch {
    return true;
  }
}

export function updateTikTokConsent(consent: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = window.localStorage.getItem(CONSENT_KEY);
    const parsed = existing ? JSON.parse(existing) : {};
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ ...parsed, marketing: consent }),
    );
  } catch {
    /* storage unavailable — leave as-is */
  }
  if (typeof window.ttq !== 'undefined') {
    window.ttq.track('Consent', { consent: consent ? 'granted' : 'denied' });
  }
}

function ttqTrack(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.ttq === 'undefined') return;
  if (!marketingConsentGranted()) return;
  if (data) {
    window.ttq.track(event, data);
  } else {
    window.ttq.track(event);
  }
}

export function trackTikTokPageView(): void {
  ttqTrack('PageView');
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

export { PIXEL_ID };
