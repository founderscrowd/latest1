import React, { useState, useEffect, useRef } from 'react';
import { User, Calendar, Users, Building, ArrowLeft, CreditCard as Edit2, Save, X, Camera, Upload, LogOut, Crown, CreditCard, Clock, Bell } from 'lucide-react';
import { CheckCircle, DollarSign, Briefcase } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, signOut } from '../lib/supabase';
import { groupAPI } from '../lib/groupApi';
import { equityAPI } from '../lib/equityApi';
import { stripeAPI } from '../lib/stripeApi';
import SubscriptionManager from './SubscriptionManager';
import PricingModal from './PricingModal';
import ConfirmationModal from './ConfirmationModal';
import EquityClaimsTab from './EquityClaimsTab';
import NotificationsPanel from './NotificationsPanel';

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
  is_public: boolean;
  current_members?: number;
  member_count?: Array<{ count: number }>;
}

interface ProfilePageProps {
  onBack: () => void;
  onViewJoinedGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  siteLogoUrl: string | null;
  userSubscription?: any;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, onViewJoinedGroup, onCreateGroup, siteLogoUrl, userSubscription }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [createdGroups, setCreatedGroups] = useState<Group[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveConfirmMessage, setLeaveConfirmMessage] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [equityClaims, setEquityClaims] = useState<any[]>([]);
  const [equityClaimsLoading, setEquityClaimsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);

  // Ref for billing section
  const billingRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Error signing out:', error);
        setSuccessMessage('Error signing out. Please try again.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        // User will be redirected automatically by the auth state change
        onBack(); // Navigate back to home
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setSuccessMessage('Error signing out. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleBillingClick = () => {
    setActiveTab('billing');
    // Smooth scroll to billing section after a short delay to ensure it's rendered
    setTimeout(() => {
      billingRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Fetch equity claims when equity tab is selected
  useEffect(() => {
    if (user && activeTab === 'equity') {
      fetchEquityClaims();
    }
  }, [user, activeTab]);

  const fetchUserData = async () => {
    if (!user) return;

    // Clear any existing error messages
    setErrorMessage('');

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else {
        setProfile(profileData);
        setEditedUsername(profileData?.username || '');
        setIsSiteAdmin(profileData?.is_site_admin || false);
      }

      // Fetch groups created by user
      const { data: createdGroupsData, error: createdError } = await supabase
        .from('groups')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (createdError) {
        console.error('Error fetching created groups:', createdError);
      } else {
        // Fetch member counts for each created group
        const groupsWithMemberCounts = await Promise.all(
          (createdGroupsData || []).map(async (group) => {
            const { data: memberData } = await supabase
              .from('group_members')
              .select('id')
              .eq('group_id', group.id)
              .eq('status', 'approved');

            const memberCount = memberData?.length || 0;
            return {
              ...group,
              member_count: [{ count: memberCount }]
            };
          })
        );
        setCreatedGroups(groupsWithMemberCounts);
      }

      // Fetch groups joined by user (this would require a group_members table in a real app)
      const joinedGroupsData = await groupAPI.getUserJoinedGroups(user.id);
      setJoinedGroups(joinedGroupsData);

    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setErrorMessage('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setErrorMessage('An error occurred while loading your profile. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEquityClaims = async () => {
    if (!user) return;

    setEquityClaimsLoading(true);
    try {
      const claims = await equityAPI.getUserEquityClaims(user.id);
      setEquityClaims(claims);
    } catch (error) {
      console.error('Error fetching equity claims:', error);
      setEquityClaims([]);
    } finally {
      setEquityClaimsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setUploading(true);
    try {
      let avatarUrl = profile && profile.avatar_url;

      // Handle avatar upload if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = data.publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: editedUsername,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Update local state
      setProfile({
        ...profile,
        username: editedUsername,
        avatar_url: avatarUrl,
      });

      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSuccessMessage('Error updating profile. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setSuccessMessage('Please select a valid image file (JPEG, PNG, or GIF)');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setSuccessMessage('File size must be less than 5MB');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

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
      ? `⚠️ WARNING: You currently have ${equityAmount}% approved equity in this group.

If you leave this group, you will LOSE ALL your equity claims (${equityAmount}%) and they will be returned to the group's available equity pool.

This action cannot be undone.

Are you absolutely sure you want to leave this group and forfeit your equity?`
      : 'Are you sure you want to leave this group?';

    setLeaveConfirmMessage(warningMessage);
    setGroupToLeave(groupId);
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeaveGroup = async () => {
    if (!user || !groupToLeave) return;

    try {
      setLeaving(true);
      await groupAPI.leaveGroup(groupToLeave, user.id);
      
      // Remove group from joined groups list
      setJoinedGroups(prev => prev.filter(g => g.id !== groupToLeave));
      
      // Dispatch event to notify App.tsx to refresh groups
      window.dispatchEvent(new CustomEvent('groupLeft', { detail: { groupId: groupToLeave } }));
      
      setShowLeaveConfirm(false);
      setGroupToLeave(null);
      setSuccessMessage('You have left the group successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error leaving group:', error);
      setSuccessMessage('Failed to leave group. Please try again.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-4">
            {/* Logo */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onBack();
              }}
              className="flex items-center hover:scale-105 transition-transform duration-300"
              title="EquityTake - Home"
            >
              {siteLogoUrl && siteLogoUrl.trim() !== '' ? (
                <img
                  src={siteLogoUrl}
                  alt="EquityTake Logo"
                  className="h-32 max-w-[576px] md:max-w-[432px] sm:max-w-[288px] object-contain"
                  onError={() => {
                    console.warn('Logo failed to load in profile header. URL was:', siteLogoUrl);
                  }}
                />
              ) : (
                <div className="w-[460px] h-32 bg-slate-200 rounded-lg flex items-center justify-center">
                  <span className="text-slate-500 text-sm font-medium">Your Logo</span>
                </div>
              )}
            </a>
            
            {/* Header Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
              >
                <ArrowLeft size={16} />
                Back to Home
              </button>
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-600">Manage your account and startup groups</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {successMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            successMessage.includes('Error') || successMessage.includes('Failed')
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          } text-sm`}>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Connection Error:</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-6 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`pb-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'groups'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Groups
          </button>
          <button
            onClick={() => setActiveTab('equity')}
            className={`pb-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'equity'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Equity Claims
          </button>
          <button
            onClick={handleBillingClick}
            className={`pb-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'billing'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Billing & Subscription
          </button>
          {isSiteAdmin && (
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 px-1 text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell size={16} />
              Notifications
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Profile Information</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    {/* Avatar Upload */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                          {avatarPreview || (profile && profile.avatar_url) ? (
                            <img
                              src={avatarPreview || profile.avatar_url}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-xl">
                              {(profile && profile.username && profile.username.charAt(0).toUpperCase()) || user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                          <Camera size={12} className="text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Profile Picture</h4>
                        <p className="text-sm text-slate-600">Click the camera icon to upload a new avatar</p>
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editedUsername}
                        onChange={(e) => setEditedUsername(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        placeholder="Enter your display name"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleUpdateProfile}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Save size={16} />
                        )}
                        {uploading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedUsername(profile?.username || '');
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Avatar Display */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                        {profile && profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-xl">
                            {(profile && profile.username && profile.username.charAt(0).toUpperCase()) || user.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">
                          {profile && profile.username || user.email?.split('@')[0] || 'User'}
                        </h4>
                        <p className="text-slate-600">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar size={14} className="text-slate-500" />
                          <span className="text-sm text-slate-500">
                            Joined {new Date(user.created_at || '').toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              {/* Premium Status */}
              {userSubscription?.subscription_status === 'active' && (
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={20} />
                    <h4 className="font-bold">Premium Member</h4>
                  </div>
                  <p className="text-sm text-yellow-100">
                    You have access to all premium features
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4">Your Activity</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Groups Created</span>
                    <span className="font-semibold text-slate-900">{createdGroups.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Groups Joined</span>
                    <span className="font-semibold text-slate-900">{joinedGroups.length}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  <button
                    onClick={onBack}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <Building size={16} />
                    Browse Groups
                  </button>
                  <button
                    onClick={onCreateGroup}
                    className="w-full flex items-center gap-2 px-4 py-3 text-white rounded-lg transition-colors font-medium"
                    style={{ backgroundColor: '#FF69B4' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF69B4'}
                  >
                    <Building size={16} />
                    Create New Group
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-6">
            {/* Created Groups */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Groups I Created ({createdGroups.length})
                </h3>
                <button
                  onClick={onCreateGroup}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                  style={{ backgroundColor: '#FF69B4' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF69B4'}
                >
                  <Building size={16} />
                  Create New Group
                </button>
              </div>

              {createdGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Building size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">You haven't created any groups yet</p>
                  <button
                    onClick={onCreateGroup}
                    className="px-4 py-2 text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#FF69B4' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF69B4'}
                  >
                    Create Your First Startup
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {createdGroups.map((group) => (
                    <div key={group.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="font-semibold text-slate-900 mb-2">{group.name}</h4>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{group.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                          {group.member_count?.[0]?.count || 0}/{group.max_members} members
                        </div>
                        <button
                          onClick={() => onViewJoinedGroup(group.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Joined Groups */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Groups I Joined ({joinedGroups.length})
              </h3>

              {joinedGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">You haven't joined any groups yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {joinedGroups.map((group) => (
                    <div key={group.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="font-semibold text-slate-900 mb-2">{group.name}</h4>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{group.description}</p>
                      
                      {/* Membership Status */}
                      {(group as any).membership_status === 'pending' && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            <Clock size={12} />
                            Pending Approval
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                          {group.member_count?.[0]?.count || 0}/{group.max_members} members
                        </div>
                        {(group as any).membership_status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Awaiting approval</span>
                            <button
                              onClick={() => handleLeaveGroup(group.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Cancel Request
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onViewJoinedGroup(group.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Visit
                            </button>
                            <button
                              onClick={() => handleLeaveGroup(group.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Leave
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'equity' && (
          <div>
            {equityClaimsLoading ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : (
              <EquityClaimsTab 
                equityClaims={equityClaims}
                onBack={onBack}
              />
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div ref={billingRef}>
            <SubscriptionManager onUpgrade={() => setShowPricingModal(true)} />
          </div>
        )}

        {activeTab === 'notifications' && isSiteAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <NotificationsPanel isAdmin={isSiteAdmin} />
          </div>
        )}
      </div>

      {/* Modals */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onShowTerms={() => {
          setShowPricingModal(false);
          setShowTermsOfService(true);
        }}
      />

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

export default ProfilePage;