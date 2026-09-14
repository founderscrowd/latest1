import React, { useState } from 'react';
import { X, Upload, Image, Info, Coins, Sprout } from 'lucide-react';
import {
  groupAPI,
  FOR_PROFIT_STRUCTURES,
  NON_PROFIT_STRUCTURES,
  isValidStructureForProfitStatus,
} from '../lib/groupApi';
import { useAuth } from '../hooks/useAuth';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
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

      await groupAPI.createGroup(groupData, user.id);
      
      // Reset form
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
          <div>
            <label className="block mb-1 font-semibold text-sm text-slate-700">
              Group Name *
            </label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
              placeholder="Enter your startup name" 
              required 
            />
          </div>
          
          <div>
            <label className="block mb-1 font-semibold text-sm text-slate-700">
              Description *
            </label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-vertical min-h-[80px] text-sm"
              placeholder="Describe your startup idea, vision, and goals..." 
              required 
            />
            <p className="text-xs text-slate-500 mt-1">
              💡 Consider including details about how initial equity is justified (e.g., cash investment, marketable securities, real estate, performed tasks) in your description.
            </p>
          </div>
          
          <div>
            <label className="block mb-1 font-semibold text-sm text-slate-700">
              Tag Line (short groups description)
            </label>
            <input 
              type="text" 
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
              placeholder="e.g., Building the future of AI-powered education" 
              maxLength={50}
            />
            <p className="text-xs text-slate-500 mt-1">
              Max 50 characters ({formData.tags.length}/50)
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-sm text-slate-700">
                Max Co-founders *
              </label>
              <input 
                type="number" 
                name="max_members"
                value={formData.max_members}
                onChange={handleInputChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                placeholder="e.g., 5" 
                min="2" 
                max="1000" 
                required 
              />
            </div>
            
            <div>
              <label className="block mb-1 font-semibold text-sm text-slate-700">
                Equity Available % *
              </label>
              <input 
                type="number" 
                name="equity_available"
                value={formData.equity_available}
                onChange={handleInputChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                placeholder="e.g., 20" 
                min="1" 
                max="100" 
                required 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-sm text-slate-700">
                Funding Required ($) *
              </label>
              <input 
                type="text" 
                name="funding_needed"
                value={formData.funding_needed}
                onChange={handleInputChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                placeholder="e.g., $250K or 250000" 
                required 
              />
            </div>
            
            <div>
              <label className="block mb-1 font-semibold text-sm text-slate-700">
                Industry *
              </label>
              <select 
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm" 
                required
              >
                <option value="">Select industry</option>
                {['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Construction', 'Automotive', 'Restaurants', 'Hotels', 'Real Estate', 'Beauty', 'Cleaning', 'Consulting', 'Legal', 'Accounting', 'Marketing', 'Media', 'Government', 'Agriculture', 'Energy', 'Transportation', 'Music', 'Arts', 'Design', 'Other'].map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block mb-1 font-semibold text-sm text-slate-700">
              Stage *
            </label>
            <div className="relative">
              <select 
                name="stage"
                value={formData.stage}
                onChange={handleInputChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm" 
                required
              >
                <option value="">Select stage</option>
                <option value="pre-incorporation">Pre-incorporation Stage</option>
                <option 
                  value="funding"
                  title="Incorporated Stage - The business is already registered"
                >
                  Incorporated Stage
                </option>
              </select>
            </div>
          </div>
          
          {/* Pre-incorporation Stage Tooltip */}
          {formData.stage === 'pre-incorporation' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">🌱</span>
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 mb-2">Pre-incorporation</h4>
                  <div className="space-y-2 text-sm text-green-800">
                    <div>
                      <strong>What it is:</strong> The step before a company exists. An idea, a group, and a proposed equity split. No shares have been issued.
                    </div>
                    <div>
                      <strong>What happens here:</strong> Co-founders join, ask questions, and claim interest in a percentage. No money is collected on EquityTake.
                    </div>
                    <div>
                      <strong>Goal:</strong> Form the team and agree who wants what. Then incorporate and handle funds through the proper legal route.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Incorporated Stage Tooltip */}
          {formData.stage === 'funding' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">💡</span>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Incorporated Stage</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div>
                      Choose this if the business is already registered. People can still claim interest here. No funds are collected on EquityTake.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block mb-1 font-semibold text-sm text-slate-700">
              Location Preference *
            </label>
            <select 
              name="location_type"
              value={formData.location_type}
              onChange={handleInputChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm" 
              required
            >
              <option value="worldwide">Worldwide (co-founders can be from anywhere)</option>
              <option value="location_based">Location-based startup (specific country/city)</option>
            </select>
          </div>
          
          {formData.location_type === 'location_based' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 font-semibold text-sm text-slate-700">
                  Country *
                </label>
                <input 
                  type="text" 
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                  placeholder="e.g., United States" 
                  required={formData.location_type === 'location_based'}
                />
              </div>
              
              <div>
                <label className="block mb-1 font-semibold text-sm text-slate-700">
                  City *
                </label>
                <input 
                  type="text" 
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                  placeholder="e.g., San Francisco" 
                  required={formData.location_type === 'location_based'}
                />
              </div>
            </div>
          )}

          {/* Organisation Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-bold text-sm text-slate-900 mb-1">Organisation</h4>
            <p className="text-xs text-slate-500 mb-3">
              Tell potential co-founders what type of venture you are creating and what organisation structure you are considering.
            </p>

            <label className="block mb-1 font-semibold text-sm text-slate-700">
              Organisation Type *
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => handleOrgTypeClick('for_profit')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  formData.organisation_type === 'for_profit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Coins size={18} className="shrink-0" />
                For-profit
              </button>
              <button
                type="button"
                onClick={() => handleOrgTypeClick('non_profit')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  formData.organisation_type === 'non_profit'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Sprout size={18} className="shrink-0" />
                Non-profit
              </button>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-slate-700">
                {formData.organisation_type === 'for_profit'
                  ? 'For-profit Organisation Structure *'
                  : formData.organisation_type === 'non_profit'
                  ? 'Non-profit Organisation Structure *'
                  : 'Organisation Structure *'}
              </label>
              <select
                key={formData.organisation_type || 'none'}
                name="legal_structure"
                value={formData.legal_structure}
                onChange={handleInputChange}
                disabled={!formData.organisation_type}
                className={`w-full p-2 border rounded-lg focus:outline-none text-sm ${
                  formData.organisation_type
                    ? 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
                required
              >
                {!formData.organisation_type && (
                  <option value="">Select an organisation type first</option>
                )}
                {formData.organisation_type === 'for_profit' && FOR_PROFIT_STRUCTURES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                {formData.organisation_type === 'non_profit' && NON_PROFIT_STRUCTURES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {formData.organisation_type
                  ? 'You can change this later as your startup develops.'
                  : 'Select For-profit or Non-profit above to see structure options.'}
              </p>
            </div>

            {formData.organisation_type === 'non_profit' && parseInt(formData.equity_available) > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Some non-profit structures may not use conventional equity ownership. Make sure your proposed structure is appropriate for your organisation and jurisdiction.
              </div>
            )}

            <p className="text-xs text-slate-500 mt-2">
              Organisation structures vary by country. These options are provided for general planning purposes and are not legal advice. Please check the requirements in your country before forming an organisation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={formData.is_public}
              onChange={handleInputChange}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-sm text-slate-700">
              Make this group publicly visible
            </label>
          </div>
          
          {/* Information about modifiable fields */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Don't worry about getting everything perfect!</h4>
                <p className="text-sm text-blue-800">
                  You can modify all of these details later through your group's settings page after creation. 
                  This includes the group name, description, tags, equity percentage, funding amount, industry, 
                  member limits, stage, and location preferences.
                </p>
              </div>
            </div>
          </div>
          
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
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;