import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, MapPin, Calendar, DollarSign, Building, Tag, Globe, Lock, Crown, Scale } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { groupAPI, formatLegalStructure, formatOrganisationType } from '../lib/groupApi';
import { supabase } from '../lib/supabase';
import { EXISTING_USER_CUTOFF_DATE } from '../App';
import ConfirmationModal from './ConfirmationModal';

interface GroupDetailsPageProps {
  groupId: string;
  onBack: () => void;
  userSubscription: any;
  onShowAuthModal: () => void;
  onShowPricingModal: () => void;
  onCreateGroup: () => void;
  onViewGroupProfile: (groupId: string) => void;
  onGroupDataUpdated?: (groupId: string) => void;
}

interface Group {
  id: string;
  name: string;
  description: string;
  tags: string[];
  equity_available: number;
  funding_needed: string;
  industry: string;
  max_members: number;
  stage: string;
  created_at: string;
  creator_id: string;
  cover_image?: string;
  is_public: boolean;
  status: 'active' | 'inactive' | 'pending';
  location_type: 'worldwide' | 'location_based';
  country?: string;
  city?: string;
  legal_structure?: string;
  organisation_type?: string;
  creator_profile?: {
    username: string;
    avatar_url?: string;
  };
  member_count?: Array<{ count: number }>;
  creator_subscription_active?: boolean;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | 'cofounder' | 'pending' | 'starter';
  status: 'approved' | 'pending' | 'rejected';
  joined_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  };
  subscription_active?: boolean;
}

const GroupDetailsPage: React.FC<GroupDetailsPageProps> = ({ 
  groupId, 
  onBack, 
  userSubscription, 
  onShowAuthModal, 
  onShowPricingModal, 
  onCreateGroup, 
  onViewGroupProfile,
  onGroupDataUpdated
}) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveConfirmMessage, setLeaveConfirmMessage] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetchGroupData();
  }, [groupId, user]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      
      // Fetch group details
      const groupData = await groupAPI.getGroup(groupId);
      setGroup(groupData);

      // Fetch members
      const membersData = await groupAPI.getGroupMembers(groupId);
      setMembers(membersData);

      // Fetch user membership if user is logged in
      if (user) {
        const membership = await groupAPI.getUserMembership(groupId, user.id);
        setUserMembership(membership);
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    // All authenticated users can join groups freely

    try {
      setJoining(true);
      setJoinMessage('');
      await groupAPI.joinGroup(groupId, user.id);
      
      // Refresh membership status
      const membership = await groupAPI.getUserMembership(groupId, user.id);
      setUserMembership(membership);
      
      // Show appropriate success message
      if (membership?.status === 'approved') {
        setJoinMessage('Welcome to the group! You are now a member.');
        // Notify parent component that group data has changed
        onGroupDataUpdated?.(groupId);
      } else if (membership?.status === 'pending') {
        setJoinMessage('Your request to join has been submitted and is pending approval.');
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setJoinMessage(''), 5000);
    } catch (error) {
      console.error('Error joining group:', error);
      setJoinMessage('Failed to join group. Please try again.');
      setTimeout(() => setJoinMessage(''), 5000);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !userMembership) return;

    // Check if user has any approved equity claims
    let hasEquity = false;
    let equityAmount = 0;
    
    try {
      const { data: equityClaims } = await supabase
        .from('equity_allocations')
        .select('amount')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'approved');
      
      if (equityClaims && equityClaims.length > 0) {
        hasEquity = true;
        equityAmount = equityClaims.reduce((sum, claim) => sum + claim.amount, 0);
      }
    } catch (error) {
      console.error('Error checking equity claims:', error);
    }

    const warningMessage = hasEquity 
      ? `🚨 CRITICAL WARNING: PERMANENT LOSS OF EQUITY AND ENGAGEMENT 🚨

You currently have ${equityAmount}% approved equity in "${group?.name}".

⚠️ LEAVING THIS GROUP WILL RESULT IN:
• IMMEDIATE FORFEITURE of ALL your equity claims (${equityAmount}%)
• PERMANENT LOSS of your ownership stake in this startup
• ALL PENDING EQUITY CLAIMS will be automatically CANCELLED
• ALL APPROVED EQUITY CLAIMS will be REVOKED immediately
• NO COMPENSATION or refund for your contributions
• EQUITY RETURNED to group's available equity pool
• LOSS OF ALL FUTURE PROFITS from this startup
• LOSS OF ALL VOTING RIGHTS and decision-making power
• COMPLETE REMOVAL from all group communications and forums
• LOSS OF ACCESS to all group chat history and discussions
• REMOVAL from all future group activities and decisions
• FORFEITURE of any intellectual property contributions
• LOSS OF ALL NETWORKING CONNECTIONS within the group

💰 FINANCIAL IMPACT:
Your ${equityAmount}% equity represents potential ownership in this startup. Once forfeited, you lose all rights to future profits, dividends, or sale proceeds.

📚 ENGAGEMENT HISTORY IMPACT:
All your forum posts, chat messages, and contributions will remain in the group but you will lose access to view them. Your engagement history and connections will be permanently severed.

🔒 THIS ACTION IS PERMANENT AND CANNOT BE UNDONE.

Are you absolutely sure you want to leave this group and forfeit your ${equityAmount}% equity plus all engagement history?`
      : `🚨 WARNING: PERMANENT LOSS OF ENGAGEMENT AND ACCESS 🚨

⚠️ LEAVING "${group?.name}" WILL RESULT IN:
• IMMEDIATE REMOVAL from all group communications and forums
• LOSS OF ACCESS to all group chat history and discussions
• REMOVAL from all future group activities and decisions
• ANY PENDING EQUITY CLAIMS will be automatically CANCELLED and LOST
• FORFEITURE of any intellectual property contributions
• LOSS OF ALL NETWORKING CONNECTIONS within the group
• PERMANENT LOSS of your member status and privileges

📚 ENGAGEMENT HISTORY IMPACT:
All your forum posts, chat messages, and contributions will remain in the group but you will lose access to view them. Your engagement history and connections will be permanently severed.

🔒 THIS ACTION IS PERMANENT AND CANNOT BE UNDONE.

Are you sure you want to leave this group and lose all access to your engagement history?`;

    setLeaveConfirmMessage(warningMessage);
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeaveGroup = async () => {
    if (!user || !userMembership) return;

    // Check equity one more time for the success message
    let hasEquity = false;
    let equityAmount = 0;
    
    try {
      const { data: equityClaims } = await supabase
        .from('equity_allocations')
        .select('amount')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'approved');
      
      if (equityClaims && equityClaims.length > 0) {
        hasEquity = true;
        equityAmount = equityClaims.reduce((sum, claim) => sum + claim.amount, 0);
      }
    } catch (error) {
      console.error('Error checking equity claims:', error);
    }

    try {
      setLeaving(true);
      await groupAPI.leaveGroup(groupId, user.id);
      setUserMembership(null);
      setShowLeaveConfirm(false);
      
      // Notify parent component that group data has changed
      onGroupDataUpdated?.(groupId);
      
      if (hasEquity) {
        setJoinMessage(`You have left the group and forfeited ${equityAmount}% equity.`);
      } else {
        setJoinMessage('You have left the group.');
      }
      setTimeout(() => setJoinMessage(''), 5000);
    } catch (error) {
      console.error('Error leaving group:', error);
      setJoinMessage('Failed to leave group. Please try again.');
      setTimeout(() => setJoinMessage(''), 5000);
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Group not found</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const memberCount = members.length;
  const canJoin = !userMembership && memberCount < group.max_members && group.is_public;
  const isMember = userMembership?.status === 'approved';
  const isPending = userMembership?.status === 'pending';
  const isRejected = userMembership?.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {group.name}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {group.name}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Building size={16} />
                      {group.industry}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(group.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      {group.is_public ? <Globe size={16} /> : <Lock size={16} />}
                      {group.is_public ? 'Public' : 'Private'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {canJoin && user && (
                    <button
                      onClick={handleJoinGroup}
                      disabled={joining}
                     className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {joining ? 'Joining...' : 'Join Group'}
                    </button>
                  )}
                  {canJoin && !user && (
                    <button
                      onClick={onShowAuthModal}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Sign Up to Join
                    </button>
                  )}
                  {isPending && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      {group.require_approval ? 'Pending Approval' : 'Processing...'}
                    </span>
                  )}
                  {isRejected && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      Request Rejected
                    </span>
                  )}
                  {isMember && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewGroupProfile(groupId)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Visit Group
                      </button>
                      <button
                        onClick={handleLeaveGroup}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Leave Group
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {group.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Description */}
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed">
                  {group.description}
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center">
                <div className="text-2xl font-bold text-emerald-600 mb-1">
                  {group.equity_available}%
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wide font-medium">
                  Equity Available
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {group.funding_needed}
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wide font-medium">
                  Funding Needed
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center">
                <div className="text-lg font-bold text-purple-600 mb-2 capitalize">
                  {group.stage === 'pre-incorporation' ? 'Pre-Incorporation' : 
                   group.stage === 'funding' ? 'Funding Stage' : group.stage}
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wide font-medium">
                  Business Stage
                </div>
              </div>
            </div>

            {/* Organisation */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Scale size={20} />
                Organisation
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Legal Structure</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatLegalStructure(group.legal_structure)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Type</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatOrganisationType(group.organisation_type)}
                  </span>
                </div>
              </div>
            </div>

            {/* Location */}
            {group.location_type === 'location_based' && group.country && group.city && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin size={20} />
                  Location
                </h3>
                <p className="text-slate-700">
                  {group.city}, {group.country}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Members */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={20} />
                Team Members ({memberCount}/{group.max_members})
              </h3>
              
              <div className="space-y-3">
                {members.length > 0 ? (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                        {member.profile?.avatar_url ? (
                          <img
                            src={member.profile.avatar_url}
                            alt={member.profile.username || 'Member'}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-slate-600 text-sm font-medium">
                            {(member.profile?.username || 'U')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {member.profile?.username || 'Unknown User'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 capitalize">
                            {member.role === 'starter' ? 'Starter' : member.role}
                          </span>
                          {member.subscription_active === false && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No members yet</p>
                )}
              </div>
            </div>

            {/* Creator Info */}
            {group.creator_profile && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Created By
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    {group.creator_profile.avatar_url ? (
                      <img
                        src={group.creator_profile.avatar_url}
                        alt={group.creator_profile.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {group.creator_profile.username[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {group.creator_profile.username}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">
                        Starter
                      </span>
                      {group.creator_subscription_active === false && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Call to Action */}
            {!user && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">
                  Ready to Join?
                </h3>
                {group.is_public ? (
                  <p className="text-sm mb-4 text-orange-100">
                    Sign up to connect with this startup and claim your equity stake.
                  </p>
                ) : (
                  <p className="text-sm mb-4 text-orange-100">
                    This is a private group. Only invited members can join.
                  </p>
                )}
                <button
                  onClick={onShowAuthModal}
                 className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                   group.is_public
                     ? 'bg-white text-purple-600 hover:bg-purple-50'
                     : 'bg-white/20 text-white cursor-not-allowed opacity-75'
                 }`}
                  disabled={!group.is_public}
                >
                  {group.is_public ? 'Sign Up to Join' : 'Private Group'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Leave Group Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleConfirmLeaveGroup}
        title="Leave Group"
        message={leaveConfirmMessage}
        confirmText="Yes, Leave Group"
        cancelText="Cancel"
        isDestructive={true}
        loading={leaving}
      />
    </div>
  );
};

export default GroupDetailsPage;