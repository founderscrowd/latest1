import React, { useState, useEffect } from 'react';
import { X, DollarSign, Briefcase, Percent, Info, Phone, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { equityAPI } from '../lib/equityApi';
import { supabase, groupAPI } from '../lib/supabase';

interface ClaimEquityModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  equityAvailable: number;
  onSuccess: () => void;
}

const ClaimEquityModal: React.FC<ClaimEquityModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  equityAvailable,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [investmentType, setInvestmentType] = useState<'cash' | 'skills/tasks' | ''>('');
  const [equityPercentage, setEquityPercentage] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [hasPendingClaim, setHasPendingClaim] = useState(false);
  const [checkingPendingClaim, setCheckingPendingClaim] = useState(false);
  const [groupStage, setGroupStage] = useState<string>('');
  const [loadingGroupData, setLoadingGroupData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setLoading(false);
      setError('');
      setSuccessMessage('');
      setInvestmentType('');
      setEquityPercentage('');
      setCountryCode('+1');
      setPhoneNumber('');
      setPhoneError('');
      setHasPendingClaim(false);
      
      // Check for existing pending claims
      checkForPendingClaim();
      fetchGroupStage();
    }
  }, [isOpen]);

  const checkForPendingClaim = async () => {
    if (!user) return;
    
    setCheckingPendingClaim(true);
    try {
      const { data, error } = await supabase
        .from('equity_allocations')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (data) {
        setHasPendingClaim(true);
      } else {
        setHasPendingClaim(false);
      }
    } catch (err) {
      console.error('Error checking for pending claims:', err);
      setHasPendingClaim(false);
    } finally {
      setCheckingPendingClaim(false);
    }
  };

  const fetchGroupStage = async () => {
    try {
      setLoadingGroupData(true);
      const { data: group, error } = await supabase
        .from('groups')
        .select('stage')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroupStage(group?.stage || '');
    } catch (err) {
      console.error('Error fetching group stage:', err);
      setGroupStage('');
    } finally {
      setLoadingGroupData(false);
    }
  };

  // Common country codes
  const countryCodes = [
    { code: '+1', country: 'US/CA' },
    { code: '+44', country: 'UK' },
    { code: '+49', country: 'DE' },
    { code: '+33', country: 'FR' },
    { code: '+39', country: 'IT' },
    { code: '+34', country: 'ES' },
    { code: '+31', country: 'NL' },
    { code: '+46', country: 'SE' },
    { code: '+47', country: 'NO' },
    { code: '+45', country: 'DK' },
    { code: '+41', country: 'CH' },
    { code: '+43', country: 'AT' },
    { code: '+32', country: 'BE' },
    { code: '+351', country: 'PT' },
    { code: '+353', country: 'IE' },
    { code: '+358', country: 'FI' },
    { code: '+91', country: 'IN' },
    { code: '+86', country: 'CN' },
    { code: '+81', country: 'JP' },
    { code: '+82', country: 'KR' },
    { code: '+61', country: 'AU' },
    { code: '+64', country: 'NZ' },
    { code: '+55', country: 'BR' },
    { code: '+52', country: 'MX' },
    { code: '+7', country: 'RU' },
    { code: '+90', country: 'TR' },
    { code: '+971', country: 'AE' },
    { code: '+966', country: 'SA' },
    { code: '+65', country: 'SG' },
    { code: '+60', country: 'MY' },
    { code: '+66', country: 'TH' },
    { code: '+84', country: 'VN' },
    { code: '+63', country: 'PH' },
    { code: '+62', country: 'ID' },
    { code: '+27', country: 'ZA' },
    { code: '+20', country: 'EG' },
    { code: '+234', country: 'NG' },
    { code: '+254', country: 'KE' }
  ];

  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }

    // Remove any non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 7) {
      setPhoneError('Phone number is too short');
      return false;
    }
    
    if (cleanPhone.length > 15) {
      setPhoneError('Phone number is too long');
      return false;
    }

    // Basic format validation (digits, spaces, hyphens, parentheses allowed)
    if (!/^[\d\s\-\(\)]+$/.test(phone)) {
      setPhoneError('Phone number contains invalid characters');
      return false;
    }

    setPhoneError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 ClaimEquityModal: handleSubmit called');
    if (!user || loading || hasPendingClaim) return;

    setError('');
    console.log('📝 ClaimEquityModal: Form validation starting...');

    // Basic validation
    if (!investmentType) {
      console.log('❌ ClaimEquityModal: Investment type not selected');
      setError('Please select how you would like to make your investment.');
      return;
    }

    const percentage = parseFloat(equityPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      console.log('❌ ClaimEquityModal: Invalid equity percentage:', percentage);
      setError('Please enter a valid equity percentage between 1 and 100.');
      return;
    }
    if (percentage > equityAvailable) {
      console.log('❌ ClaimEquityModal: Equity exceeds available:', { requested: percentage, available: equityAvailable });
      setError(`The requested equity (${percentage}%) exceeds the available equity (${equityAvailable}%).`);
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(phoneNumber)) {
      console.log('❌ ClaimEquityModal: Phone number validation failed');
      return;
    }

    console.log('✅ ClaimEquityModal: All validations passed, submitting claim...');
    setLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      console.log('📞 ClaimEquityModal: Submitting with phone:', fullPhoneNumber);
      await equityAPI.requestEquityClaim(groupId, percentage, investmentType, fullPhoneNumber);
      console.log('✅ ClaimEquityModal: Equity claim submitted successfully');
      setSuccessMessage('Your equity claim has been submitted successfully!');
      console.log('💬 ClaimEquityModal: Success message set, calling onSuccess...');
      // Don't call onSuccess immediately - let user see the success message first
      console.log('🎉 ClaimEquityModal: onSuccess called, success state should now be visible');
    } catch (err: any) {
      console.error('❌ ClaimEquityModal: Error submitting equity claim:', err);
      console.error('Error submitting equity claim:', err);
      setError(err.message || 'Failed to submit equity claim. Please try again.');
    } finally {
      setLoading(false);
      console.log('🏁 ClaimEquityModal: handleSubmit completed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900">Claim Equity in {groupName}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={loading && !successMessage}
          >
            <X size={20} />
          </button>
        </div>

        {/* Greeting and Information */}
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm mb-4">
          <p className="font-semibold mb-2">Thank you for your interest in {groupName}!</p>
          <p className="flex items-start gap-2">
            <Info size={16} className="mt-0.5" />
            Generally for pre-incorporation stage funds will be collected at the time of incorporation, please contact Starter or admin for further details.
          </p>
        </div>

        {/* Funding Stage Warning */}
        {groupStage === 'funding' && !loadingGroupData && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg text-sm mb-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={16} className="mt-0.5 text-orange-600" />
              <p className="font-semibold text-orange-900">Important: Pre-Legal Binding Stage Notice</p>
            </div>
            <div className="space-y-2">
              <p>
                <strong>This equity claim is not legally binding.</strong> This platform facilitates discussions 
                and preliminary agreements only. No legal ownership is transferred through this platform.
              </p>
              <div className="bg-orange-100 border border-orange-300 rounded p-3 mt-3">
                <div className="flex items-start gap-2 mb-2">
                  <Shield size={14} className="mt-0.5 text-orange-700" />
                  <span className="font-semibold text-orange-900">Safe Fund Transfer Practices:</span>
                </div>
                <ul className="text-sm text-orange-800 space-y-1 ml-4">
                  <li>• Use escrow services for large transactions</li>
                  <li>• Verify all legal documentation before transferring funds</li>
                  <li>• Consult with legal professionals for binding agreements</li>
                  <li>• Never send money without proper legal protections</li>
                  <li>• Document all agreements in writing with witnesses</li>
                </ul>
              </div>
              <p className="font-semibold text-orange-900 mt-3">
                ⚠️ DISCLAIMER: This platform is not responsible for any real financial transactions. 
                All fund transfers and legal agreements are solely between the parties involved.
              </p>
            </div>
          </div>
        )}

        {checkingPendingClaim && (
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm mb-4">
            Checking for existing claims...
          </div>
        )}

        {hasPendingClaim && !checkingPendingClaim && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-4">
            <p className="font-semibold mb-1">Pending Claim Found</p>
            <p>You already have a pending equity claim for this group. Please wait for approval or rejection before submitting a new claim.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-4 ${hasPendingClaim ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Success State - Show when successMessage is 'success' */}
          {successMessage && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Claim Submitted!</h4>
                <p className="text-slate-600 text-sm">
                  Your equity claim for {equityPercentage}% equity has been submitted successfully and is now pending approval from the group administrators. Please follow for updates on Equity Structure page.
                </p>
              </div>
              <button
                onClick={() => {
                  console.log('🚪 ClaimEquityModal: Success close button clicked, calling onSuccess...');
                  onSuccess();
                  onClose();
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          )}

          {/* Form - Hide when success state is shown */}
          <div className={successMessage ? 'hidden' : ''}>
          {/* Investment Type */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-700">
              How would you like to make your investment? *
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer flex-1 transition-colors ${
                  investmentType === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="investmentType"
                  value="cash"
                  checked={investmentType === 'cash'}
                  onChange={() => setInvestmentType('cash')}
                  className="form-radio text-blue-600"
                  disabled={loading || hasPendingClaim}
                />
                <DollarSign size={20} className="text-green-600" />
                <span className="font-medium text-slate-800">Cash</span>
              </label>
              <label
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer flex-1 transition-colors ${
                  investmentType === 'skills/tasks' ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="investmentType"
                  value="skills/tasks"
                  checked={investmentType === 'skills/tasks'}
                  onChange={() => setInvestmentType('skills/tasks')}
                  className="form-radio text-blue-600"
                  disabled={loading || hasPendingClaim}
                />
                <Briefcase size={20} className="text-purple-600" />
                <span className="font-medium text-slate-800">Skills/Tasks</span>
              </label>
            </div>
          </div>

          {/* Equity Percentage */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-700">
              What percentage would you like to claim? (%) *
            </label>
            <div className="relative">
              <input
                type="number"
                value={equityPercentage}
                onChange={(e) => setEquityPercentage(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                placeholder={`Available: ${equityAvailable}%`}
                min="1"
                max={equityAvailable}
                step="0.1"
                required
                disabled={loading || hasPendingClaim}
              />
              <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Current available equity for this group: <span className="font-semibold text-blue-600">{equityAvailable}%</span>
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-700">
              Contact Phone Number *
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                disabled={loading || hasPendingClaim}
              >
                {countryCodes.map(({ code, country }) => (
                  <option key={code} value={code}>
                    {code} {country}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (phoneError) {
                      validatePhoneNumber(e.target.value);
                    }
                  }}
                  onBlur={() => validatePhoneNumber(phoneNumber)}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm ${
                    phoneError 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                  placeholder="Enter your phone number"
                  required
                  disabled={loading || hasPendingClaim}
                />
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>
            {phoneError && (
              <p className="text-xs text-red-600 mt-1">{phoneError}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Include your phone number with country code for direct contact regarding your equity claim
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading || !investmentType || !equityPercentage || !phoneNumber.trim() || !!phoneError || hasPendingClaim || checkingPendingClaim}
              className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : hasPendingClaim ? 'Pending Claim Exists' : 'Submit Equity Claim'}
            </button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimEquityModal;