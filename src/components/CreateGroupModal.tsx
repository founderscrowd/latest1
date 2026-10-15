import React, { useState } from 'react';
import { X } from 'lucide-react';
import { groupAPI, isValidStructureForProfitStatus } from '../lib/groupApi';
import { useAuth } from '../hooks/useAuth';
import { trackTikTokCreateGroup } from '../lib/tiktokPixel';
import { trackEvent as trackGAEvent } from '../lib/googleAnalytics';
import { trackCustomEvent as trackMetaCustomEvent } from '../lib/metaPixel';
import GroupFormFields, { type GroupFormData } from './GroupFormFields';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<GroupFormData>({
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
    organisation_type: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to create a group');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const groupData = {
        name: formData.name,
        description: formData.description,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        equity_available: parseInt(formData.equity_available),
        funding_needed: formData.funding_needed,
        industry: formData.industry,
        max_members: parseInt(formData.max_members),
        stage: formData.stage,
        is_public: formData.is_public,
        location_type: formData.location_type,
        country: formData.country,
        city: formData.city,
        legal_structure: formData.legal_structure,
        organisation_type: formData.organisation_type
      };

      const createdGroup = await groupAPI.createGroup(groupData, user.id);

      trackTikTokCreateGroup(createdGroup.id, groupData.name);
      trackGAEvent('create_group', { group_id: createdGroup.id });
      trackMetaCustomEvent('GroupCreated', { group_id: createdGroup.id });

      setFormData({
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
        organisation_type: ''
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900">
            Create New Startup Group
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <GroupFormFields
            formData={formData}
            onInputChange={handleInputChange}
            onOrgTypeClick={handleOrgTypeClick}
          />

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: loading ? '#FF69B4' : '#FF69B4' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#E91E63')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#FF69B4')}
            >
              {loading ? 'Creating...' : 'Publish Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
