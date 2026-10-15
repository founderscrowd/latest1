const DRAFT_KEY = 'groupDraft_v1';
const PUBLISH_FLAG_KEY = 'groupDraftPublishing_v1';
const ANALYTICS_FIRED_KEY = 'groupDraftAnalyticsFired_v1';

export interface GroupDraftData {
  name: string;
  description: string;
  tags: string;
  equity_available: string;
  funding_needed: string;
  industry: string;
  max_members: string;
  stage: string;
  is_public: boolean;
  location_type: string;
  country: string;
  city: string;
  legal_structure: string;
  organisation_type: string;
}

export interface GroupDraft extends GroupDraftData {
  draftId: string;
  savedAt: string;
}

const EMPTY_DRAFT: GroupDraftData = {
  name: '',
  description: '',
  tags: '',
  equity_available: '',
  funding_needed: '',
  industry: '',
  max_members: '',
  stage: '',
  is_public: true,
  location_type: 'worldwide',
  country: '',
  city: '',
  legal_structure: 'not_yet_decided',
  organisation_type: '',
};

function generateDraftId(): string {
  return 'draft-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

export function loadDraft(): GroupDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.draftId) return null;
    return parsed as GroupDraft;
  } catch {
    return null;
  }
}

export function saveDraft(data: GroupDraftData, existingDraftId?: string): GroupDraft {
  const draft: GroupDraft = {
    ...data,
    draftId: existingDraftId || generateDraftId(),
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage might be full or unavailable
  }
  return draft;
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // no-op
  }
}

export function setPublishingPending(pending: boolean): void {
  try {
    if (pending) {
      localStorage.setItem(PUBLISH_FLAG_KEY, '1');
    } else {
      localStorage.removeItem(PUBLISH_FLAG_KEY);
    }
  } catch {
    // no-op
  }
}

export function isPublishingPending(): boolean {
  try {
    return localStorage.getItem(PUBLISH_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAnalyticsFired(draftId: string, event: string): void {
  try {
    const key = `${ANALYTICS_FIRED_KEY}_${draftId}`;
    const raw = localStorage.getItem(key);
    const fired = raw ? JSON.parse(raw) : [];
    if (!fired.includes(event)) {
      fired.push(event);
      localStorage.setItem(key, JSON.stringify(fired));
    }
  } catch {
    // no-op
  }
}

export function hasAnalyticsFired(draftId: string, event: string): boolean {
  try {
    const key = `${ANALYTICS_FIRED_KEY}_${draftId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const fired = JSON.parse(raw);
    return fired.includes(event);
  } catch {
    return false;
  }
}

export function clearAnalyticsFired(draftId: string): void {
  try {
    localStorage.removeItem(`${ANALYTICS_FIRED_KEY}_${draftId}`);
  } catch {
    // no-op
  }
}

export function getEmptyDraftData(): GroupDraftData {
  return { ...EMPTY_DRAFT };
}

export { DRAFT_KEY, PUBLISH_FLAG_KEY };
