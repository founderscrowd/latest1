import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  MessageSquare, 
  Calendar,
  MapPin,
  Globe,
  Lock,
  Building,
  DollarSign,
  TrendingUp,
  UserPlus,
  Image as ImageIcon,
  Camera,
  Share2,
  Target,
  Link,
  Info,
  Star,
  Archive,
  Search,
  Filter,
  MoreVertical,
  Menu, 
  X,
  User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { groupAPI } from '../lib/groupApi';
import { chatAPI } from '../lib/chatApi';
import { supabase } from '../lib/supabase';
import ClaimEquityModal from './ClaimEquityModal';
import GroupSettingsPage from './GroupSettingsPage';
import GroupEquityClaimsManager from './GroupEquityClaimsManager';
import GroupEquityStructureContent from './GroupEquityStructureContent';
import ChatWindow from './chat/ChatWindow';
import MessageOrganizer from './chat/MessageOrganizer';
import ForumTopicList from './forum/ForumTopicList';
import ForumTopicView from './forum/ForumTopicView';
import CreateTopicModal from './forum/CreateTopicModal';
import DescriptionPopover from './DescriptionPopover';
import MembersHoverPreview from './MembersHoverPreview';
import FullScreenDescriptionModal from './FullScreenDescriptionModal';
import ConfirmationModal from './ConfirmationModal';

interface Group {
  id: string;
  name: string;
  slug?: string;
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
  location_type?: string;
  country?: string;
  city?: string;
  creator_profile?: {
    username: string;
    avatar_url?: string;
  };
  member_count?: Array<{ count: number }>;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: 'admin' | 'member' | 'cofounder' | 'pending' | 'starter';
  status: 'approved' | 'pending' | 'rejected';
  joined_at: string;
  profile: {
    username: string;
    avatar_url?: string;
  };
  subscription_active?: boolean;
}

interface GroupProfilePageProps {
  groupId: string;
  onBack: () => void;
  siteLogoUrl?: string | null;
  onShowProfile: () => void;
}

const GroupProfilePage: React.FC<GroupProfilePageProps> = ({ groupId, onBack, siteLogoUrl, onShowProfile }) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [showSettings, setShowSettings] = useState(false);
  const [showClaimEquityModal, setShowClaimEquityModal] = useState(false);
  const [showEquityManager, setShowEquityManager] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showMessageOrganizer, setShowMessageOrganizer] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showCreateTopicModal, setShowCreateTopicModal] = useState(false);
  
  // Popover states
  const [showDescriptionPopover, setShowDescriptionPopover] = useState(false);
  const [descriptionTargetRect, setDescriptionTargetRect] = useState<DOMRect | null>(null);
  const [showMembersPreview, setShowMembersPreview] = useState(false);
  const [membersTargetRect, setMembersTargetRect] = useState<DOMRect | null>(null);
  const [showFullScreenDescription, setShowFullScreenDescription] = useState(false);

  // Leave group confirmation states
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveConfirmMessage, setLeaveConfirmMessage] = useState('');
  const [leaving, setLeaving] = useState(false);

  // Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Main header mobile menu state
  const [showMainHeaderMenu, setShowMainHeaderMenu] = useState(false);

  // Full-screen equity structure state
  const [showEquityStructureFullScreen, setShowEquityStructureFullScreen] = useState(false);

  // Full-screen chat state
  const [isChatFullScreen, setIsChatFullScreen] = useState(false);

  // Full-screen forum state
  const [isForumFullScreen, setIsForumFullScreen] = useState(false);

  // Conversation state
  const [conversation, setConversation] = useState<any>(null);

  // Share functionality state
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [shareTooltipText, setShareTooltipText] = useState('Copy link');

  // Ref for equity manager section
  const equityManagerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetchGroupData();
  }, [groupId, user]);

  useEffect(() => {
    if (group) {
      initializeGroupChat();
    }
  }, [group]);

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

  const initializeGroupChat = async () => {
    try {
      // Try to get existing group conversation
      let groupConversation = await chatAPI.getGroupConversation(groupId);
      
      if (!groupConversation) {
        // Create group conversation if it doesn't exist
        const conversationId = await chatAPI.createGroupConversation(groupId, group?.name);
        setConversationId(conversationId);
        // Fetch the created conversation
        groupConversation = await chatAPI.getGroupConversation(groupId);
      } else {
        setConversationId(groupConversation.id);
      }
      
      setConversation(groupConversation);
    } catch (error) {
      console.error('Error initializing group chat:', error);
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
      ? `⚠️ WARNING: You currently have ${equityAmount}% approved equity in this group.

If you leave this group, you will LOSE ALL your equity claims (${equityAmount}%) and they will be returned to the group's available equity pool.

This action cannot be undone.

Are you absolutely sure you want to leave this group and forfeit your equity?`
      : 'Are you sure you want to leave this group?';

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
      
      // Navigate back after successful leave
      onBack();
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group. Please try again.');
    } finally {
      setLeaving(false);
    }
  };

  const handleGroupUpdated = (updatedGroup: Group) => {
    setGroup(updatedGroup);
    if (updatedGroup.name && conversation) {
      setConversation({ ...conversation, name: updatedGroup.name });
    }
  };

  const handleClaimEquitySuccess = () => {
    console.log('💰 GroupProfilePage: handleClaimEquitySuccess called');
    console.log('💰 GroupProfilePage: Closing ClaimEquityModal...');
    setShowClaimEquityModal(false);
    console.log('💰 GroupProfilePage: About to refresh group data...');
    // Refresh group data to update equity available
    fetchGroupData();
    console.log('💰 GroupProfilePage: Group data refresh initiated');
  };

  const handleDescriptionHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDescriptionTargetRect(rect);
    setShowDescriptionPopover(true);
  };

  const handleMembersHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMembersTargetRect(rect);
    setShowMembersPreview(true);
  };

  const handleOpenFullScreenDescription = (description: string, groupName?: string) => {
    setShowFullScreenDescription(true);
  };

  const handleToggleChatFullScreen = () => {
    setIsChatFullScreen(!isChatFullScreen);
  };

  const handleToggleForumFullScreen = () => {
    setIsForumFullScreen(!isForumFullScreen);
  };
  
  const handleShareGroup = async () => {
    try {
      // Generate the clean group URL using slug for SEO-friendly sharing
      const groupSlug = group?.slug;
      const groupUrl = groupSlug
        ? `${window.location.origin}/groups/${groupSlug}`
        : `${window.location.origin}/?group=${groupId}`;
      
      // Try to use the modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(groupUrl);
        setShareTooltipText('Copied!');
        setShowShareTooltip(true);
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = groupUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setShareTooltipText('Copied!');
          setShowShareTooltip(true);
        } catch (err) {
          console.error('Fallback copy failed:', err);
          setShareTooltipText('Copy failed');
          setShowShareTooltip(true);
        }
        
        document.body.removeChild(textArea);
      }
      
      // Reset tooltip after 2 seconds
      setTimeout(() => {
        setShowShareTooltip(false);
        setShareTooltipText('Copy link');
      }, 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      setShareTooltipText('Copy failed');
      setShowShareTooltip(true);
      
      // Reset tooltip after 2 seconds
      setTimeout(() => {
        setShowShareTooltip(false);
        setShareTooltipText('Copy link');
      }, 2000);
    }
  };

  const handleManageEquityClick = () => {
    setShowEquityManager(true);
    // Smooth scroll to equity manager section after a short delay to ensure it's rendered
    setTimeout(() => {
      equityManagerRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading group...</p>
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

  const isCreator = group.creator_id === user?.id;
  const isAdmin = userMembership?.role === 'admin' || userMembership?.role === 'starter';
  const isMember = userMembership?.status === 'approved';
  const canManageGroup = isCreator || isAdmin;
  const canClaimEquity = isMember && !isCreator && group.equity_available > 0;

  if (showSettings) {
    return (
      <>
        <GroupSettingsPage
          groupId={groupId}
          onBack={() => setShowSettings(false)}
          onGroupUpdated={handleGroupUpdated}
        />

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
      </>
    );
  }

  if (showEquityStructureFullScreen) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <button
              onClick={() => setShowEquityStructureFullScreen(false)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
            >
              <ArrowLeft size={18} />
              Back to Group Profile
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Equity Structure</h1>
                <p className="text-slate-600">{group.name} - Complete ownership breakdown</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <GroupEquityStructureContent 
            groupId={groupId} 
            isCurrentUserCreator={isCreator}
            isCurrentUserAdmin={isAdmin}
          />
        </div>
      </div>
    );
  }

  if (selectedTopicId) {
    // Full-screen forum topic view
    if (isForumFullScreen) {
      return (
        <ForumTopicView
          topicId={selectedTopicId}
          onBack={() => {
            setSelectedTopicId(null);
            setIsForumFullScreen(false);
          }}
          canModerate={userMembership?.role === 'admin' || userMembership?.role === 'starter' || group.creator_id === user?.id}
          onToggleFullScreen={handleToggleForumFullScreen}
          isFullScreen={true}
        />
      );
    }
    
    // Regular forum topic view
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 py-4">
          <div className="max-w-6xl mx-auto px-4">
            <button
              onClick={() => {
                setSelectedTopicId(null);
                setIsForumFullScreen(false);
              }}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
            >
              <ArrowLeft size={18} />
              Back to Forum
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <ForumTopicView
            topicId={selectedTopicId}
            onBack={() => {
              setSelectedTopicId(null);
              setIsForumFullScreen(false);
            }}
            canModerate={userMembership?.role === 'admin' || userMembership?.role === 'starter' || group.creator_id === user?.id}
            onToggleFullScreen={handleToggleForumFullScreen}
            isFullScreen={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-4 relative">
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
                  className="h-36 max-w-[720px] object-contain"
                  onError={() => {
                    console.warn('Logo failed to load in group profile header. URL was:', siteLogoUrl);
                  }}
                />
              ) : (
                <div className="w-[460px] h-36 bg-slate-200 rounded-lg flex items-center justify-center">
                  <span className="text-slate-500 text-sm font-medium">Your Logo</span>
                </div>
              )}
            </a>
            
            {/* Mobile Menu Button for Main Header */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowMainHeaderMenu(!showMainHeaderMenu)}
                className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                {showMainHeaderMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
            
            {/* Desktop Navigation - Always visible on large screens */}
            <div className="hidden lg:flex items-center gap-2">
              {user && (
                <button
                  onClick={onShowProfile}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <User size={16} className="text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Profile
                  </span>
                </button>
              )}
              
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
              >
                <ArrowLeft size={16} />
              Exit Group
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('about');
                  setShowMainHeaderMenu(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                  activeTab === 'about'
                    ? 'bg-pink-600 text-white'
                    : 'bg-pink-600 text-white hover:bg-pink-700'
                }`}
              >
                <Info size={16} />
                About
              </button>
              
              {isMember && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('forum');
                      setShowMainHeaderMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold text-sm text-white"
                    style={{ 
                      backgroundColor: '#00008B',
                      opacity: activeTab === 'forum' ? 1 : 0.9
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a8b'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00008B'}
                  >
                    <MessageSquare size={16} />
                    Forum
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('chat');
                      setShowMainHeaderMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold text-sm text-white"
                    style={{ 
                      backgroundColor: '#800080',
                      opacity: activeTab === 'chat' ? 1 : 0.9
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9a009a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#800080'}
                  >
                    <MessageSquare size={16} />
                    Group Chat
                  </button>
                </>
              )}
              
              {canManageGroup && (
                <>
                  <button
                    onClick={() => {
                      handleManageEquityClick();
                      setShowMainHeaderMenu(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                  >
                    Manage Equity
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setShowMainHeaderMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold text-sm"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </>
              )}
              
              {isMember && (
                <button
                  onClick={() => {
                    setShowEquityStructureFullScreen(true);
                    setShowMainHeaderMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
                >
                  <TrendingUp size={16} />
                  Equity Structure
                </button>
              )}
            </div>
            
            {/* Mobile Navigation Menu - Dropdown */}
            <div className={`absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 lg:hidden ${showMainHeaderMenu ? 'flex flex-col' : 'hidden'}`}>
                {user && (
                  <button
                    onClick={() => {
                      onShowProfile();
                      setShowMainHeaderMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    <User size={16} className="text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">
                      Profile
                    </span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    onBack();
                    setShowMainHeaderMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-red-50 transition-colors text-red-600"
                >
                  <ArrowLeft size={16} />
                  <span className="text-sm font-medium">Exit Group</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab('about');
                    setShowMainHeaderMenu(false);
                  }}
                  className={`flex items-center gap-2 w-full px-4 py-3 text-left transition-colors ${
                    activeTab === 'about'
                      ? 'bg-pink-50 text-pink-600'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Info size={16} />
                  <span className="text-sm font-medium">About</span>
                </button>
                
                {isMember && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab('forum');
                        setShowMainHeaderMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left transition-colors text-white"
                      style={{ 
                        backgroundColor: '#00008B',
                        opacity: activeTab === 'forum' ? 1 : 0.9
                      }}
                    >
                      <MessageSquare size={16} />
                      <span className="text-sm font-medium">Forum</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        setShowMainHeaderMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left transition-colors text-white"
                      style={{ 
                        backgroundColor: '#800080',
                        opacity: activeTab === 'chat' ? 1 : 0.9
                      }}
                    >
                      <MessageSquare size={16} />
                      <span className="text-sm font-medium">Group Chat</span>
                    </button>
                   
                   {canManageGroup && (
                     <button
                       onClick={() => {
                         setActiveTab('settings');
                         setShowMainHeaderMenu(false);
                       }}
                       className={`flex items-center gap-2 w-full px-4 py-3 text-left transition-colors ${
                         activeTab === 'settings'
                           ? 'bg-slate-50 text-slate-600'
                           : 'hover:bg-slate-50 text-slate-700'
                       }`}
                     >
                       <Settings size={16} />
                       <span className="text-sm font-medium">Group Settings</span>
                     </button>
                   )}
                  </>
                )}
                
                {canManageGroup && (
                  <>
                    <button
                      onClick={() => {
                        handleManageEquityClick();
                        setShowMainHeaderMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <TrendingUp size={16} />
                      <span className="text-sm font-medium text-slate-700">Manage Equity</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setShowMainHeaderMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <Settings size={16} />
                      <span className="text-sm font-medium text-slate-700">Settings</span>
                    </button>
                  </>
                )}
                
                {isMember && (
                  <button
                    onClick={() => {
                      setShowEquityStructureFullScreen(true);
                      setShowMainHeaderMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <TrendingUp size={16} />
                    <span className="text-sm font-medium text-slate-700">Equity Structure</span>
                  </button>
                )}
              </div>
          </div>
          
          {/* Group Name and Basic Info */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="lg:w-1/3">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{group.name}</h1>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {group.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Additional Info - moved from sidebar */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} />
                  <span>
                    {group.location_type === 'worldwide' ? 'Worldwide' : `${group.city}, ${group.country}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {group.is_public ? <Globe size={14} /> : <Lock size={14} />}
                  <span>
                    {group.is_public ? 'Public group' : 'Private group'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Share:</span>
                <div className="relative">
                  <button 
                    onClick={handleShareGroup}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
                    title="Copy group link to clipboard"
                  >
                    <Link size={14} />
                    Groups link
                  </button>
                  
                  {/* Tooltip */}
                  {showShareTooltip && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap z-50">
                      {shareTooltipText}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Key Metrics - Compact version next to group name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:w-2/3">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp size={18} />
                  <span className="text-green-100 text-xs">Available</span>
                </div>
                <div className="text-xl font-bold">{group.equity_available}%</div>
                <div className="text-green-100 text-xs uppercase tracking-wide">EQUITY</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={18} />
                  <span className="text-orange-100 text-xs">Target</span>
                </div>
                <div className="text-xl font-bold">{group.funding_needed}</div>
                <div className="text-orange-100 text-xs uppercase tracking-wide">FUNDING</div>
              </div>
              
              {/* Group Details Block */}
              <div className="bg-slate-100 rounded-xl p-4 text-slate-800 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <Info size={18} className="text-slate-600" />
                  <span className="text-slate-500 text-xs">Details</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Industry</span>
                    <span className="text-sm font-bold text-slate-900">{group.industry}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Stage</span>
                    <span className="text-sm font-bold text-slate-900">{group.stage}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Max Members</span>
                    <span className="text-sm font-bold text-slate-900">{group.max_members}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Created</span>
                    <span className="text-sm font-bold text-slate-900">
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 relative">
        <div className="max-w-6xl mx-auto px-4">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between lg:hidden py-2">
            <h3 className="text-lg font-semibold text-slate-900">Navigation</h3>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={`flex-col lg:flex lg:flex-row ${showMobileMenu ? 'flex' : 'hidden'} absolute lg:static top-full left-0 w-full bg-white shadow-lg lg:shadow-none py-2 lg:py-0 z-30`}>
              {[
                { key: 'about', label: 'About', icon: Info },
                { key: 'members', label: `Members (${members.length})`, icon: Users },
                { key: 'equity', label: 'Equity Structure', icon: TrendingUp },
               ...(isMember ? [
                 { key: 'forum', label: 'Forum', icon: MessageSquare },
                 { key: 'chat', label: 'Group Chat', icon: MessageSquare }
               ] : []),
               ...(canManageGroup ? [
                 { key: 'settings', label: 'Group Settings', icon: Settings }
               ] : [])
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setShowMobileMenu(false);
                    setShowEquityStructureFullScreen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 lg:border-b-2 border-l-4 lg:border-l-0 transition-colors w-full lg:w-auto ${
                    activeTab === key
                     ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                 style={
                   activeTab === key && key === 'chat' 
                     ? { backgroundColor: '#800080', color: 'white', borderColor: '#800080' }
                     : activeTab === key && key === 'forum'
                     ? { backgroundColor: '#00008B', color: 'white', borderColor: '#00008B' }
                     : {}
                 }
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: (canClaimEquity && activeTab !== 'forum') || activeTab === 'forum' ? '100px' : '24px' }}>
        {/* Equity Manager */}
        {showEquityManager && canManageGroup && (
          <div ref={equityManagerRef} className="mb-6">
            <GroupEquityClaimsManager
              groupId={groupId}
              isCurrentUserCreator={isCreator}
              isAdmin={isAdmin}
              onGroupUpdated={handleGroupUpdated}
            />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">About this group</h3>
                  <div className="flex items-center gap-2">
                    <div
                      className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm"
                      onMouseEnter={handleDescriptionHover}
                      onMouseLeave={() => setShowDescriptionPopover(false)}
                    >
                      Quick preview
                    </div>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed">
                    {group.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Members</h3>
                  <div
                    className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm"
                    onMouseEnter={handleMembersHover}
                    onMouseLeave={() => setShowMembersPreview(false)}
                  >
                    See all ({members.length})
                  </div>
                </div>
                
                <div className="space-y-3">
                  {members.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {member.profile?.username?.charAt(0)?.toUpperCase() || 'M'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 text-sm">
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
                  ))}
                  {members.length > 5 && (
                    <div className="text-sm text-slate-500 text-center pt-2">
                      +{members.length - 5} more members
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Group Info */}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">
              All Members ({members.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {member.profile?.username?.charAt(0)?.toUpperCase() || 'M'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {member.profile?.username || 'Unknown User'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-slate-500 capitalize">
                        {member.role === 'starter' ? 'Starter' : member.role}
                      </span>
                      {member.subscription_active === false && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'equity' && (
          <GroupEquityStructureContent 
            groupId={groupId} 
            isCurrentUserCreator={isCreator}
            isCurrentUserAdmin={isAdmin}
          />
        )}

        {activeTab === 'forum' && (
          <ForumTopicList
            groupId={groupId}
            onTopicSelect={setSelectedTopicId}
            onCreateTopic={() => setShowCreateTopicModal(true)}
            canCreateTopics={isMember}
          />
        )}

        {activeTab === 'chat' && conversationId && (
          <>
            {/* Full-Screen Chat Overlay */}
            {isChatFullScreen && (
              <div className="fixed inset-0 z-50 bg-white">
                <ChatWindow
                  conversationId={conversationId}
                  conversation={conversation}
                  onToggleFullScreen={handleToggleChatFullScreen}
                  isFullScreen={true}
                  className="h-full"
                />
              </div>
            )}
            
            {/* Regular Chat View */}
            {!isChatFullScreen && (
              <div className="space-y-6">
                {/* Chat Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <MessageSquare size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Group Chat</h3>
                        <p className="text-sm text-slate-600">Real-time discussion with your team</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Chat Window - Fixed height with proper bottom spacing for claim button */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-y-auto" style={{ minHeight: '400px' }}>
                  <ChatWindow
                    conversationId={conversationId}
                    conversation={conversation}
                    onToggleFullScreen={handleToggleChatFullScreen}
                    isFullScreen={false}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'settings' && canManageGroup && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-700 rounded-lg flex items-center justify-center">
                <Settings size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Group Settings</h3>
                <p className="text-sm text-slate-600">Manage your group configuration and members</p>
              </div>
            </div>
            
            <div className="text-center py-8">
              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Open Group Settings
              </button>
              <p className="text-sm text-slate-600 mt-2">
                Access detailed group configuration, member management, and privacy settings
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Fixed Bottom Claim Equity Button - Only visible on Group Profile Page */}
      {canClaimEquity && !isChatFullScreen && activeTab !== 'forum' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🚀</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Ready to claim your equity stake?</div>
                  <div className="text-xs text-slate-600">{group.equity_available}% available in {group.name}</div>
                </div>
              </div>
              <button
                onClick={() => setShowClaimEquityModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Claim Equity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showClaimEquityModal && (
        <ClaimEquityModal
          isOpen={showClaimEquityModal}
          onClose={() => {
            console.log('🚪 GroupProfilePage: ClaimEquityModal onClose called');
            setShowClaimEquityModal(false);
          }}
          groupId={groupId}
          groupName={group.name}
          equityAvailable={group.equity_available}
          onSuccess={handleClaimEquitySuccess}
        />
      )}

      {showCreateTopicModal && (
        <CreateTopicModal
          isOpen={showCreateTopicModal}
          onClose={() => setShowCreateTopicModal(false)}
          groupId={groupId}
          onTopicCreated={() => {
            setShowCreateTopicModal(false);
            // Refresh forum topics
          }}
        />
      )}

      {showMessageOrganizer && conversationId && (
        <MessageOrganizer
          isOpen={showMessageOrganizer}
          onClose={() => setShowMessageOrganizer(false)}
          conversationId={conversationId}
          groupId={groupId}
        />
      )}

      {/* Popovers */}
      {showDescriptionPopover && descriptionTargetRect && (
        <DescriptionPopover
          targetRect={descriptionTargetRect}
          description={group.description}
          groupName={group.name}
          onClose={() => setShowDescriptionPopover(false)}
          onOpenFullScreen={() => handleOpenFullScreenDescription(group.description, group.name)}
        />
      )}

      {showMembersPreview && membersTargetRect && (
        <MembersHoverPreview
          targetRect={membersTargetRect}
          members={members}
          onClose={() => setShowMembersPreview(false)}
        />
      )}

      {showFullScreenDescription && (
        <FullScreenDescriptionModal
          isOpen={showFullScreenDescription}
          onClose={() => setShowFullScreenDescription(false)}
          description={group.description}
          groupName={group.name}
        />
      )}

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

export default GroupProfilePage;