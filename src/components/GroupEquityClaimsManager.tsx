import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  Calendar,
  AlertCircle,
  TrendingUp,
  Award,
  FileText,
  Phone
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { equityAPI, EquityAllocation } from '../lib/equityApi';
import { groupAPI } from '../lib/groupApi';

interface GroupEquityClaimsManagerProps {
  groupId: string;
  isCurrentUserCreator: boolean;
  isAdmin: boolean;
  onGroupUpdated: (group: any) => void;
}

const GroupEquityClaimsManager: React.FC<GroupEquityClaimsManagerProps> = ({
  groupId,
  isCurrentUserCreator,
  isAdmin,
  onGroupUpdated
}) => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<EquityAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState(''); // State for displaying messages (success/error)
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected'>('pending'); // Default to 'pending'
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [claimToReject, setClaimToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (groupId && (isCurrentUserCreator || isAdmin)) {
      fetchEquityClaims();
    }
  }, [groupId, isCurrentUserCreator, isAdmin]);

  const fetchEquityClaims = async () => {
    try {
      setLoading(true);
      const fetchedClaims = await equityAPI.getGroupEquityClaims(groupId);
      setClaims(fetchedClaims);
    } catch (error) {
      console.error('Error fetching equity claims:', error);
      setMessage('Error loading equity claims. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    if (!user) return;

    try {
      setActionLoading(claimId);
      await equityAPI.approveEquityClaim(claimId, user.id);
      
      // Update the claim in local state
      setClaims(prev => prev.map(claim => 
        claim.id === claimId 
          ? { ...claim, status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }
          : claim
      ));

      // Refresh group data to update available equity
      const updatedGroup = await groupAPI.getGroup(groupId);
      onGroupUpdated(updatedGroup);

      setMessage('Equity claim approved successfully!');
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Error approving claim:', error);
      setMessage(error.message || 'Error approving claim. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    setClaimToReject(claimId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!user || !claimToReject) return;

    try {
      setRejecting(true);
      await equityAPI.rejectEquityClaim(claimToReject, user.id, rejectionReason.trim() || undefined);
      
      // Update the claim in local state
      setClaims(prev => prev.map(claim => 
        claim.id === claimToReject 
          ? { 
              ...claim, 
              status: 'rejected', 
              approved_by: user.id, 
              approved_at: new Date().toISOString(),
              notes: rejectionReason.trim() || null
            }
          : claim
      ));

      setMessage('Equity claim rejected.');
      setTimeout(() => setMessage(''), 5000);
      
      // Close modal and reset state
      setShowRejectModal(false);
      setClaimToReject(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting claim:', error);
      setMessage(error.message || 'Error rejecting claim. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setRejecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredClaims = claims.filter(claim => {
    if (activeFilter === 'all') return true;
    return claim.status === activeFilter;
  });

  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const rejectedCount = claims.filter(c => c.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Equity Claims Management</h3>
            <p className="text-sm text-slate-600">Review and manage equity allocation requests</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('Error') 
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'pending', label: 'Pending', count: pendingCount },
          { key: 'approved', label: 'Approved', count: approvedCount },
          { key: 'rejected', label: 'Rejected', count: rejectedCount }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeFilter === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-12">
          <Award size={48} className="text-slate-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">
            {activeFilter === 'all' ? 'No equity claims yet' : `No ${activeFilter} claims`}
          </h4>
          <p className="text-slate-600">
            {activeFilter === 'pending' 
              ? 'No pending claims to review at this time.'
              : activeFilter === 'all'
              ? 'Members haven\'t submitted any equity claims yet.'
              : `No ${activeFilter} claims found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {claim.user_profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {claim.user_profile?.username || 'Unknown User'}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={12} />
                        <span>Requested {formatDate(claim.requested_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Claim Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp size={14} className="text-green-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{claim.amount}%</div>
                        <div className="text-xs text-slate-600">Equity Requested</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        {claim.investment_type === 'cash' ? (
                          <DollarSign size={14} className="text-blue-600" />
                        ) : (
                          <Briefcase size={14} className="text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 capitalize">
                          {claim.investment_type === 'skills/tasks' ? 'Skills/Tasks' : 'Cash'}
                        </div>
                        <div className="text-xs text-slate-600">Investment Type</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        {getStatusIcon(claim.status)}
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                        </span>
                        <div className="text-xs text-slate-600 mt-1">Status</div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {claim.approved_at && (
                    <div className="text-sm text-slate-600 mb-2">
                      {claim.status === 'approved' ? 'Approved' : 'Processed'} on {formatDate(claim.approved_at)}
                    </div>
                  )}

                  {claim.notes && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={14} className="text-slate-600" />
                        <span className="text-sm font-medium text-slate-900">Notes</span>
                      </div>
                      <p className="text-sm text-slate-700">{claim.notes}</p>
                    </div>
                  )}

                  {/* Contact Information */}
                  {claim.phone_number && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone size={14} className="text-blue-600" />
                        <span className="text-sm font-medium text-slate-900">Contact Information</span>
                      </div>
                      <p className="text-sm text-slate-700">
                        <a 
                          href={`tel:${claim.phone_number}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {claim.phone_number}
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {claim.status === 'pending' && (isCurrentUserCreator || isAdmin) && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApproveClaim(claim.id)}
                      disabled={actionLoading === claim.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {actionLoading === claim.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectClaim(claim.id)}
                      disabled={actionLoading === claim.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {actionLoading === claim.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <XCircle size={16} />
                      )}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {claims.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 mb-3">Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">{claims.length}</div>
              <div className="text-sm text-slate-600">Total Claims</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-slate-600">Pending Review</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-sm text-slate-600">Approved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0)}%
              </div>
              <div className="text-sm text-slate-600">Total Allocated</div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Claim Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle size={20} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Reject Equity Claim</h3>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for rejection (optional)
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                placeholder="e.g., wrong number, could not contact"
                maxLength={40}
                disabled={rejecting}
              />
              <div className="text-right text-xs text-slate-500 mt-1">
                {rejectionReason.length}/40 characters
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                This reason will be visible to the user on their profile page under rejected claims.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setClaimToReject(null);
                  setRejectionReason('');
                }}
                disabled={rejecting}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Reject Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupEquityClaimsManager;