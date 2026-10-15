import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import MarketingPage from '../components/MarketingPage';
import GroupFormFields, { type GroupFormData } from '../components/GroupFormFields';
import { groupAPI, isValidStructureForProfitStatus } from '../lib/groupApi';
import { useAuth } from '../hooks/useAuth';
import {
  loadDraft, saveDraft, clearDraft, setPublishingPending, isPublishingPending,
  getEmptyDraftData, hasAnalyticsFired, setAnalyticsFired, clearAnalyticsFired,
  type GroupDraft,
} from '../lib/groupDraft';
import { trackEvent as trackGAEvent } from '../lib/googleAnalytics';
import { trackTikTokCreateGroup } from '../lib/tiktokPixel';
import { trackCustomEvent as trackMetaCustomEvent } from '../lib/metaPixel';

interface CreateStartupGroupPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onRequireAuth: () => void;
}

const CreateStartupGroupPage: React.FC<CreateStartupGroupPageProps> = ({ onBack, siteLogoUrl, onRequireAuth }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<GroupFormData>(getEmptyDraftData());
  const [draftId, setDraftId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [publishingResult, setPublishingResult] = useState<{ groupId: string; slug: string } | null>(null);
  const [publishAttempted, setPublishAttempted] = useState(false);

  const draftInitialized = useRef(false);
  const beginTracked = useRef(false);
  const publishingRef = useRef(false);

  // Load draft on mount
  useEffect(() => {
    if (draftInitialized.current) return;
    draftInitialized.current = true;

    const existing = loadDraft();
    if (existing) {
      setFormData({ ...existing });
      setDraftId(existing.draftId);
    }
  }, []);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (!draftInitialized.current) return;
    if (!formData.name && !formData.description && !draftId) return;

    const timeoutId = setTimeout(() => {
      const saved = saveDraft(formData, draftId || undefined);
      setDraftId(saved.draftId);
      setDraftSaved(true);
      const fadeTimer = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(fadeTimer);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [formData, draftId]);

  // Track begin_group_creation once per session
  useEffect(() => {
    if (beginTracked.current) return;
    const hasInteracted = formData.name || formData.description || formData.industry;
    if (hasInteracted && draftId) {
      if (!hasAnalyticsFired(draftId, 'begin_group_creation')) {
        trackGAEvent('begin_group_creation');
        setAnalyticsFired(draftId, 'begin_group_creation');
      }
      beginTracked.current = true;
    }
  }, [formData, draftId]);

  // Auto-publish after auth (OAuth redirect, email confirmation return, or existing-user sign-in)
  const publishFromDraft = useCallback(async (currentDraftId: string, currentFormData: GroupFormData) => {
    if (!currentDraftId) return;
    setLoading(true);
    setError('');

    try {
      const groupData = {
        name: currentFormData.name,
        description: currentFormData.description,
        tags: currentFormData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        equity_available: parseInt(currentFormData.equity_available) || 0,
        funding_needed: currentFormData.funding_needed,
        industry: currentFormData.industry,
        max_members: parseInt(currentFormData.max_members) || 5,
        stage: currentFormData.stage,
        is_public: currentFormData.is_public,
        location_type: currentFormData.location_type,
        country: currentFormData.country,
        city: currentFormData.city,
        legal_structure: currentFormData.legal_structure,
        organisation_type: currentFormData.organisation_type,
      };

      const createdGroup = await groupAPI.publishGroup(currentDraftId, groupData);

      // Fire analytics (idempotent guard)
      if (!hasAnalyticsFired(currentDraftId, 'create_group')) {
        trackTikTokCreateGroup(createdGroup.id, groupData.name);
        trackGAEvent('create_group', { group_id: createdGroup.id });
        trackMetaCustomEvent('GroupCreated', { group_id: createdGroup.id });
        setAnalyticsFired(currentDraftId, 'create_group');
      }

      clearDraft();
      clearAnalyticsFired(currentDraftId);
      setPublishingPending(false);
      publishingRef.current = false;
      setSuccess(true);
      setPublishingResult({ groupId: createdGroup.id, slug: createdGroup.slug });

      setTimeout(() => {
        navigate(`/groups/${createdGroup.slug}/`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to publish your group. Please try again.');
      setPublishingPending(false);
      publishingRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Check for pending publish when user becomes available
  // Uses a ref guard to prevent duplicate calls across re-renders / re-mounts
  useEffect(() => {
    if (user && isPublishingPending() && draftId && !loading && !success && !publishingRef.current) {
      publishingRef.current = true;
      setPublishAttempted(true);
      publishFromDraft(draftId, formData);
    }
  }, [user, draftId, loading, success, publishFromDraft]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => {
      const next: typeof prev = {
        ...prev,
        [name]: checked !== undefined ? checked : value,
      };

      if (name === 'organisation_type') {
        if (!isValidStructureForProfitStatus(value, prev.legal_structure)) {
          next.legal_structure = 'not_yet_decided';
        }
      }

      return next;
    });
  };

  const handleOrgTypeClick = (value: string) => {
    setFormData(prev => {
      const next: typeof prev = { ...prev, organisation_type: value };
      if (!isValidStructureForProfitStatus(value, prev.legal_structure)) {
        next.legal_structure = 'not_yet_decided';
      }
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) { setError('Group name is required'); return false; }
    if (!formData.description.trim()) { setError('Description is required'); return false; }
    if (!formData.funding_needed.trim()) { setError('Proposed company value is required'); return false; }
    if (!formData.industry) { setError('Industry is required'); return false; }
    if (!formData.stage) { setError('Stage is required'); return false; }
    if (!formData.max_members || parseInt(formData.max_members) < 2) { setError('Max co-founders must be at least 2'); return false; }
    if (formData.equity_available === '' || parseInt(formData.equity_available) < 0) { setError('Equity available is required'); return false; }
    if (formData.location_type === 'location_based') {
      if (!formData.country.trim()) { setError('Country is required for location-based groups'); return false; }
      if (!formData.city.trim()) { setError('City is required for location-based groups'); return false; }
    }
    if (!formData.organisation_type) { setError('Organisation type is required'); return false; }
    if (!formData.legal_structure) { setError('Organisation structure is required'); return false; }
    return true;
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    // Save draft with current data
    const saved = saveDraft(formData, draftId || undefined);
    setDraftId(saved.draftId);

    // Track publish_group_clicked
    if (!hasAnalyticsFired(saved.draftId, 'publish_group_clicked')) {
      trackGAEvent('publish_group_clicked');
      setAnalyticsFired(saved.draftId, 'publish_group_clicked');
    }

    if (user) {
      // User is signed in — publish immediately
      await publishFromDraft(saved.draftId, formData);
    } else {
      // User is signed out — mark pending and open auth modal
      setPublishingPending(true);
      onRequireAuth();
    }
  };

  if (success && publishingResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Your group is live!</h2>
          <p className="text-sm text-slate-500 mb-4">
            Redirecting you to your new group...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <MarketingPage
      onBack={onBack}
      siteLogoUrl={siteLogoUrl}
      onCreateGroup={() => {}}
      title="Create a startup group around your idea"
      metaDescription="Start or join a startup group built on one idea or project. Match co-founders inside the group and discuss proposed equity before you incorporate. Free to use."
      h1="Create a startup group around your idea"
      subtitle="Gather founders around a project — then match as co-founders and talk through proposed equity splits inside the group."
      greyLine="Not profile dating. Not a hobby meetup."
      secondaryCtaTo="/"
      secondaryCtaLabel="Browse groups"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">{error}</p>
              {publishAttempted && user && (
                <button
                  onClick={handlePublish}
                  className="mt-2 px-4 py-1.5 rounded-lg text-sm text-white font-semibold bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Retry Publishing
                </button>
              )}
            </div>
          </div>
        )}

        {!user && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              Fill out your group details below — you'll create a free account when you're ready to publish. Your progress is saved automatically.
            </p>
          </div>
        )}

        <form onSubmit={handlePublish} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <GroupFormFields
            formData={formData}
            onInputChange={handleInputChange}
            onOrgTypeClick={handleOrgTypeClick}
          />

          {draftSaved && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 size={14} className="text-green-500" />
              Draft saved
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-semibold text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: loading ? '#FF69B4' : '#FF69B4' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#E91E63')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#FF69B4')}
            >
              {loading ? 'Publishing...' : 'Publish Group'}
            </button>
          </div>
        </form>

        <p className="leading-relaxed text-slate-700">
          Once your group exists, people can find it, join it, and start talking with you in group chat.
        </p>

        <div className="border-t border-slate-200 pt-5 mt-2">
          <p className="text-sm text-slate-500 mb-2 font-medium">Related reading</p>
          <Link to="/blog/create-a-startup-group-around-your-idea/" className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium">
            Step-by-step: create a startup group around your idea
          </Link>
        </div>
      </div>
    </MarketingPage>
  );
};

export default CreateStartupGroupPage;
