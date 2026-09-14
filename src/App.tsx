import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Plus, X, LogOut, User, CircleUser as UserCircle, Settings, Crown, CreditCard, Landmark, Briefcase } from 'lucide-react';
import AuthModal from './components/AuthModal';
import ProfilePage from './components/ProfilePage';
import GroupDetailsPage from './components/GroupDetailsPage';
import GroupProfilePage from './components/GroupProfilePage';
import CreateGroupModal from './components/CreateGroupModal';
import SiteSettingsPage from './components/SiteSettingsPage';
import PricingModal from './components/PricingModal';
import StripeSuccessPage from './components/StripeSuccessPage';
import StripeCancelPage from './components/StripeCancelPage';
import Footer from './components/Footer';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsOfServicePage from './components/TermsOfServicePage';
import PricingInfoModal from './components/PricingInfoModal';
import CookiePolicyPage from './components/CookiePolicyPage';
import ContactModal from './components/ContactModal';
import FeedbackModal from './components/FeedbackModal';
import AiSupportWidget from './components/AiSupportWidget';
import BlogAndAboutPage from './components/BlogAndAboutPage';
import HowItWorksPage from './components/HowItWorksPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import AboutPage from './pages/AboutPage';
import GroupDetailsRoute from './pages/GroupDetailsRoute';
import GroupProfileRoute from './pages/GroupProfileRoute';
import GroupsListPage from './pages/GroupsListPage';
import PaymentSuccessRoute from './pages/PaymentSuccessRoute';
import PaymentCancelRoute from './pages/PaymentCancelRoute';
import LegacyGroupRedirect from './pages/LegacyGroupRedirect';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { useAuth } from './hooks/useAuth';
import { usePresence } from './hooks/usePresence';
import { signOut } from './lib/supabase';
import { groupAPI, formatLegalStructure, formatOrganisationType } from './lib/groupApi';
import { siteSettingsAPI } from './lib/siteSettingsApi';
import { stripeAPI } from './lib/stripeApi';

// Build identifier for cache busting
console.log('🚀🚀🚀 APP.TSX LOADED - BUILD v2025-10-03-ADMIN-FIX 🚀🚀🚀');

// Cutoff date for existing vs new users
export const EXISTING_USER_CUTOFF_DATE = new Date('2025-09-20T00:00:00Z');

interface GroupData {
  id: string;
  name: string;
  slug: string;
  tags: string[];
  equityAvailable: number;
  fundingNeeded: string;
  industry: string;
  currentMembers: number;
  maxMembers: number;
  joined: boolean;
  creator_id?: string;
  is_public: boolean;
  cover_image?: string;
  legal_structure?: string;
  organisation_type?: string;
}

interface Particle {
  element: HTMLDivElement;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
}

interface CofounderAvatar {
  element: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX?: number;
  targetY?: number;
  groupId?: number;
  opacity: number;
  phase: 'floating' | 'grouping' | 'disappearing';
  avatar: string;
}

const App: React.FC = () => {
  console.log('🚀🚀🚀 APP COMPONENT LOADED - BUILD VERSION: 2025-09-30-v4 🚀🚀🚀');
  console.log('🔧 Checking if useEffect is defined:', typeof useEffect);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialAuthModeSignUp, setInitialAuthModeSignUp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showCookiePolicy, setShowCookiePolicy] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
  const [siteAnnouncementText, setSiteAnnouncementText] = useState<string | null>(null);
  const [siteAnnouncementEnabled, setSiteAnnouncementEnabled] = useState(false);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);
  const [bannerPulsing, setBannerPulsing] = useState(false);
  const bannerPulseTriggered = useRef(false);
  const [importantMessageText, setImportantMessageText] = useState<string | null>(null);
  const [importantMessageEnabled, setImportantMessageEnabled] = useState(false);
  const [isImportantMessageDismissed, setIsImportantMessageDismissed] = useState(false);
  const [isUserSiteAdmin, setIsUserSiteAdmin] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showStripeSuccess, setShowStripeSuccess] = useState(false);
  const [showStripeCancel, setShowStripeCancel] = useState(false);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [showPricingInfoModal, setShowPricingInfoModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showBlogAndAbout, setShowBlogAndAbout] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  
  // Debug logging for modal states
  useEffect(() => {
    console.log('🔍 App.tsx: Modal states changed:', {
      isCreateModalOpen,
      isAuthModalOpen,
      showProfile,
      selectedGroupId,
      showGroupProfile,
      showSiteSettings,
      showPrivacyPolicy,
      showTermsOfService,
      showPricingModal,
      showStripeSuccess,
      showStripeCancel
    });
    
    // Log specifically when CreateGroupModal opens unexpectedly
    if (isCreateModalOpen) {
      console.log('🚨 App.tsx: CreateGroupModal is now OPEN');
      console.trace('🔍 App.tsx: Stack trace for CreateGroupModal opening');
    }
  }, [isCreateModalOpen, isAuthModalOpen, showProfile, selectedGroupId, showGroupProfile, showSiteSettings, showPrivacyPolicy, showTermsOfService, showPricingModal, showStripeSuccess, showStripeCancel]);

  const { user, loading, error: authError } = useAuth();
  usePresence(); // Initialize presence tracking
  const navigate = useNavigate();
  const location = useLocation();

  // TEST: Inline immediate execution
  console.log('⚡⚡⚡ IMMEDIATE LOG BEFORE useEffect - user:', user?.id, 'loading:', loading);

  // TEST: Simple useEffect to verify hooks work
  useEffect(() => {
    console.log('✅✅✅ TEST useEffect FIRED - user:', user?.id, 'loading:', loading);
  }, [user, loading]);

  console.log('>>> APP RENDER - loading:', loading, 'user:', user?.id, 'isUserSiteAdmin:', isUserSiteAdmin);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const heroRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cofoundersRef = useRef<CofounderAvatar[]>([]);
  const animationRef = useRef<number>();
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    createParticles();
    createCofounderAvatars();
    startCofounderAnimation();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle URL parameters for shared group links and redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromUrl = urlParams.get('group');
    const sessionId = urlParams.get('session_id');
    const cancelled = urlParams.get('cancelled');

    // Handle legacy group URLs
    if (groupIdFromUrl) {
      console.log('Legacy group URL found, redirecting to /redirect');
      navigate(`/redirect?group=${groupIdFromUrl}`, { replace: true });
    }

    // Handle Stripe success redirect
    if (sessionId) {
      navigate(`/payment/success?session_id=${sessionId}`, { replace: true });
    }

    // Handle Stripe cancel redirect
    if (cancelled === 'true') {
      navigate('/payment/cancelled', { replace: true });
    }
  }, [navigate]); // Run on mount and when navigate changes

  useEffect(() => {
    // Listen for logo updates from SiteSettingsPage
    const handleLogoUpdate = (event: CustomEvent) => {
      console.log('Logo update event received:', event.detail);
      setSiteLogoUrl(event.detail.logoUrl);
    };

    const handleAnnouncementUpdated = (event: CustomEvent) => {
      console.log('App.tsx: Announcement updated event received:', event.detail);
      setSiteAnnouncementText(event.detail.text);
      setSiteAnnouncementEnabled(event.detail.enabled);
      // Reset dismissed state if announcement changes
      localStorage.removeItem('announcementDismissed');
      setIsAnnouncementDismissed(false);
    };

    const handleImportantMessageUpdated = (event: CustomEvent) => {
      console.log('App.tsx: Important message updated event received:', event.detail);
      setImportantMessageText(event.detail.text);
      setImportantMessageEnabled(event.detail.enabled);
      localStorage.removeItem('importantMessageDismissed');
      setIsImportantMessageDismissed(false);
    };

    // Load dismissed state from local storage
    const dismissed = localStorage.getItem('announcementDismissed');
    if (dismissed === 'true') {
      setIsAnnouncementDismissed(true);
    }

    const importantDismissed = localStorage.getItem('importantMessageDismissed');
    if (importantDismissed === 'true') {
      setIsImportantMessageDismissed(true);
    }

    // Listen for pricing modal requests from Footer
    const handleShowPricingModal = () => {
      setShowPricingModal(true);
    };

    // Listen for pricing info modal requests from Footer
    const handleShowPricingInfoModal = () => {
      setShowPricingInfoModal(true);
    };

    // Listen for contact modal requests from Footer
    const handleShowContactModal = () => {
      setShowContactModal(true);
    };

    const handleShowFeedbackModal = () => {
      setShowFeedbackModal(true);
    };

    // Listen for group leave events to refresh groups
    const handleGroupLeft = (event: CustomEvent) => {
      console.log('Group left event received:', event.detail);
      // Refresh groups to update membership status
      fetchGroups();
    };
    window.addEventListener('logoUpdated', handleLogoUpdate as EventListener);
    window.addEventListener('announcementUpdated', handleAnnouncementUpdated as EventListener);
    window.addEventListener('importantMessageUpdated', handleImportantMessageUpdated as EventListener);
    window.addEventListener('showPricingModal', handleShowPricingModal as EventListener);
    window.addEventListener('showPricingInfoModal', handleShowPricingInfoModal as EventListener);
    window.addEventListener('showContactModal', handleShowContactModal as EventListener);
    window.addEventListener('showFeedbackModal', handleShowFeedbackModal as EventListener);
    window.addEventListener('groupLeft', handleGroupLeft as EventListener);
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate as EventListener);
      window.removeEventListener('announcementUpdated', handleAnnouncementUpdated as EventListener);
      window.removeEventListener('importantMessageUpdated', handleImportantMessageUpdated as EventListener);
      window.removeEventListener('showPricingModal', handleShowPricingModal as EventListener);
      window.removeEventListener('showPricingInfoModal', handleShowPricingInfoModal as EventListener);
      window.removeEventListener('showContactModal', handleShowContactModal as EventListener);
      window.removeEventListener('showFeedbackModal', handleShowFeedbackModal as EventListener);
      window.removeEventListener('groupLeft', handleGroupLeft as EventListener);
    };
  }, []);

  const fetchSiteLogo = async () => {
    try {
      const logoUrl = await siteSettingsAPI.getLogoUrl();
      console.log('Fetched logo URL:', logoUrl);
      setSiteLogoUrl(logoUrl);
      
      const { text, enabled } = await siteSettingsAPI.getAnnouncementSettings();
      setSiteAnnouncementText(text);
      setSiteAnnouncementEnabled(enabled);

      const { text: msgText, enabled: msgEnabled } = await siteSettingsAPI.getImportantMessageSettings();
      setImportantMessageText(msgText);
      setImportantMessageEnabled(msgEnabled);
    } catch (error) {
      console.error('Error fetching site logo:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      console.log('=== ADMIN CHECK START ===');
      console.log('User ID:', user?.id);
      console.log('User Email:', user?.email);
      const isAdmin = await siteSettingsAPI.isCurrentUserSiteAdmin();
      console.log('=== ADMIN CHECK RESULT:', isAdmin, '===');
      setIsUserSiteAdmin(isAdmin);
      console.log('=== ADMIN STATUS SET TO:', isAdmin, '===');
    } catch (error) {
      console.error('=== ADMIN CHECK ERROR ===', error);
      setIsUserSiteAdmin(false);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      if (user) {
        const subscription = await stripeAPI.getUserSubscription();
        setUserSubscription(subscription);
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    }
  };

  const fetchGroups = async () => {
    console.log('=== FETCHGROUPS START ===');
    console.log('Current user state:', user);
    console.log('Loading state:', loading);
    console.log('User ID:', user?.id);
    console.log('User state:', user);
    console.log('Loading state:', loading);
    try {
      setGroupsLoading(true);
      let fetchedGroups;
      console.log('Attempting to fetch groups...'); // DEBUG: Check if function is called
      
      try {
        console.log('About to call groupAPI.getGroups...');
        fetchedGroups = await groupAPI.getGroups({ limit: 50 });
        console.log('Raw fetched groups from API:', fetchedGroups); // DEBUG: Check raw API response
      } catch (apiError) {
        // Check if this is a network connectivity error
        const isNetworkError = apiError instanceof TypeError && 
          (apiError.message.includes('Failed to fetch') || 
           apiError.message.includes('fetch') ||
           apiError.message.includes('Network request failed'));
        
        if (isNetworkError) {
          console.warn('⚠️ Network connectivity issue detected while fetching groups');
          console.warn('🔧 This usually indicates:');
          console.warn('  - Internet connection problems');
          console.warn('  - Supabase project is paused/inactive');
          console.warn('  - Firewall/VPN blocking connection');
          console.warn('  - Incorrect Supabase URL in .env file');
          console.warn('📋 Please check your Supabase project status and network connection');
        } else {
          console.error('API Error fetching groups:', apiError);
          console.error('API Error details:', apiError.message, apiError.stack);
        }
        fetchedGroups = [];
      }
      
      // Transform API data to match component interface
      let transformedGroups = [];
      
      if (fetchedGroups && fetchedGroups.length > 0) {
        transformedGroups = await Promise.all(
          fetchedGroups.map(async (group) => {
            let isJoined = false;
            
            // Check if user is a member of this group
            if (user) {
              try {
                const membership = await groupAPI.getUserMembership(group.id, user.id);
                isJoined = membership?.status === 'approved';
              } catch (error) {
                console.error('Error checking membership for group:', group.id, error);
              }
            }
        
            return {
              id: group.id,
              name: group.name,
              slug: group.slug,
              tags: group.tags,
              equityAvailable: group.equity_available,
              fundingNeeded: group.funding_needed,
              industry: group.industry,
              currentMembers: group.member_count?.[0]?.count || 0,
              maxMembers: group.max_members,
              joined: isJoined,
              creator_id: group.creator_id, // Add creator_id for ownership check
              creator_username: group.creator_profile?.username || 'Unknown',
              is_public: group.is_public,
              cover_image: group.cover_image,
              location_type: group.location_type,
              country: group.country,
              city: group.city,
              legal_structure: group.legal_structure,
              organisation_type: group.organisation_type
            };
          })
        );
      }
      console.log('Transformed groups:', transformedGroups); // DEBUG: Check transformed data
      
      setGroups(transformedGroups);
    } catch (error) {
      console.error('Error fetching groups (outer catch):', error); // DEBUG: Enhanced error logging
      // Final fallback to sample data
      setGroups([
        {
          id: 'sample-1',
          name: "AI-Powered EdTech Platform",
          tags: ["Artificial Intelligence", "Personalized Learning", "SaaS"],
          equityAvailable: 15,
          fundingNeeded: "$250K",
          industry: "Education",
          currentMembers: 2,
          maxMembers: 5,
          joined: false,
          is_public: true
        },
        {
          id: 'sample-2',
          name: "Sustainable Fashion Marketplace",
          tags: ["Eco-friendly", "E-commerce", "B2C"],
          equityAvailable: 20,
          fundingNeeded: "$150K",
          industry: "Retail",
          currentMembers: 1,
          maxMembers: 4,
          joined: false,
          is_public: true
        }
      ]);
    } finally {
      setGroupsLoading(false);
    }
  };

  // Separate useEffect for each concern to avoid dependency issues
  // IMPORTANT: These must be AFTER all function definitions they call
  useEffect(() => {
    console.log('>>> useEffect [loading] triggered - loading:', loading);
    if (!loading) {
      console.log('>>> Loading complete, fetching initial data');
      fetchGroups();
      fetchSiteLogo();
      fetchUserSubscription();
    }
  }, [loading]);

  useEffect(() => {
    console.log('🔵🔵🔵 useEffect [user] TRIGGERED - user:', user?.id);
    if (user) {
      console.log('🟢🟢🟢 User detected, calling checkAdminStatus');
      const checkAdmin = async () => {
        try {
          console.log('🟡🟡🟡 ADMIN CHECK START 🟡🟡🟡');
          console.log('User ID:', user?.id);
          console.log('User Email:', user?.email);
          const isAdmin = await siteSettingsAPI.isCurrentUserSiteAdmin();
          console.log('🟢🟢🟢 ADMIN CHECK RESULT:', isAdmin, '🟢🟢🟢');
          setIsUserSiteAdmin(isAdmin);
          console.log('🟢🟢🟢 ADMIN STATUS SET TO:', isAdmin, '🟢🟢🟢');
        } catch (error) {
          console.error('🔴🔴🔴 ADMIN CHECK ERROR 🔴🔴🔴', error);
          setIsUserSiteAdmin(false);
        }
      };
      checkAdmin();
    } else {
      console.log('🔴🔴🔴 No user in useEffect, setting admin to false');
      setIsUserSiteAdmin(false);
    }
  }, [user]);

  const avatarEmojis = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '👨‍⚕️', '👩‍⚕️', '👨‍🏫', '👩‍🏫', '👨‍🔧', '👩‍🔧'];

  const createCofounderAvatars = () => {
    if (!heroRef.current) return;
    
    const hero = heroRef.current;
    const numAvatars = Math.floor(Math.random() * 9) + 7; // 7-15 avatars
    
    for (let i = 0; i < numAvatars; i++) {
      const avatar = document.createElement('div');
      avatar.className = 'absolute w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-xs pointer-events-none transition-opacity duration-1000 z-10 shadow-sm';
      avatar.textContent = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
      
      // Start from edges/corners
      let startX, startY;
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: // top
          startX = Math.random() * hero.clientWidth;
          startY = -24;
          break;
        case 1: // right
          startX = hero.clientWidth + 24;
          startY = Math.random() * hero.clientHeight;
          break;
        case 2: // bottom
          startX = Math.random() * hero.clientWidth;
          startY = hero.clientHeight + 24;
          break;
        case 3: // left
          startX = -24;
          startY = Math.random() * hero.clientHeight;
          break;
        default:
          startX = Math.random() * hero.clientWidth;
          startY = Math.random() * hero.clientHeight;
      }
      
      avatar.style.left = startX + 'px';
      avatar.style.top = startY + 'px';
      hero.appendChild(avatar);
      
      cofoundersRef.current.push({
        element: avatar,
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: 1,
        phase: 'floating',
        avatar: avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)]
      });
    }
  };

  const startCofounderAnimation = () => {
    const animate = () => {
      if (!heroRef.current) return;
      
      const hero = heroRef.current;
      const cofounders = cofoundersRef.current;
      
      cofounders.forEach((cofounder, index) => {
        if (cofounder.phase === 'floating') {
          // Random floating movement
          cofounder.x += cofounder.vx;
          cofounder.y += cofounder.vy;
          
          // Bounce off edges
          if (cofounder.x < 0 || cofounder.x > hero.clientWidth - 24) {
            cofounder.vx *= -1;
          }
          if (cofounder.y < 0 || cofounder.y > hero.clientHeight - 24) {
            cofounder.vy *= -1;
          }
          
          // Keep within bounds
          cofounder.x = Math.max(0, Math.min(hero.clientWidth - 24, cofounder.x));
          cofounder.y = Math.max(0, Math.min(hero.clientHeight - 24, cofounder.y));
          
          // Randomly start grouping
          if (Math.random() < 0.002 && !cofounder.groupId) {
            const groupSize = Math.floor(Math.random() * 4) + 2; // 2-5 members
            const groupId = Date.now() + index;
            const centerX = Math.random() * (hero.clientWidth - 100) + 50;
            const centerY = Math.random() * (hero.clientHeight - 100) + 50;
            
            // Find nearby cofounders to group with
            const nearbyCofounder = cofounders
              .filter(c => !c.groupId && c !== cofounder)
              .sort((a, b) => {
                const distA = Math.sqrt((a.x - cofounder.x) ** 2 + (a.y - cofounder.y) ** 2);
                const distB = Math.sqrt((b.x - cofounder.x) ** 2 + (b.y - cofounder.y) ** 2);
                return distA - distB;
              })
              .slice(0, groupSize - 1);
            
            // Assign group
            [cofounder, ...nearbyCofounder].forEach((member, i) => {
              member.groupId = groupId;
              member.phase = 'grouping';
              member.targetX = centerX + (Math.cos(i * (Math.PI * 2) / groupSize) * 20);
              member.targetY = centerY + (Math.sin(i * (Math.PI * 2) / groupSize) * 20);
            });
          }
        } else if (cofounder.phase === 'grouping') {
          // Move towards group center
          if (cofounder.targetX !== undefined && cofounder.targetY !== undefined) {
            const dx = cofounder.targetX - cofounder.x;
            const dy = cofounder.targetY - cofounder.y;
            cofounder.x += dx * 0.02;
            cofounder.y += dy * 0.02;
            
            // If close enough to target, start disappearing
            if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
              cofounder.phase = 'disappearing';
            }
          }
        } else if (cofounder.phase === 'disappearing') {
          // Fade out
          cofounder.opacity -= 0.01;
          if (cofounder.opacity <= 0) {
            // Remove and create new one
            cofounder.element.remove();
            cofoundersRef.current.splice(index, 1);
            
            // Create new avatar after a delay
            setTimeout(() => {
              if (cofoundersRef.current.length < 15) {
                createSingleCofounderAvatar();
              }
            }, Math.random() * 3000 + 1000);
          }
        }
        
        // Update DOM
        cofounder.element.style.left = cofounder.x + 'px';
        cofounder.element.style.top = cofounder.y + 'px';
        cofounder.element.style.opacity = cofounder.opacity.toString();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const createSingleCofounderAvatar = () => {
    if (!heroRef.current) return;
    
    const hero = heroRef.current;
    const avatar = document.createElement('div');
    avatar.className = 'absolute w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-xs pointer-events-none transition-opacity duration-1000 z-10 shadow-sm';
    avatar.textContent = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
    
    // Start from edges
    let startX, startY;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: // top
        startX = Math.random() * hero.clientWidth;
        startY = -24;
        break;
      case 1: // right
        startX = hero.clientWidth + 24;
        startY = Math.random() * hero.clientHeight;
        break;
      case 2: // bottom
        startX = Math.random() * hero.clientWidth;
        startY = hero.clientHeight + 24;
        break;
      case 3: // left
        startX = -24;
        startY = Math.random() * hero.clientHeight;
        break;
      default:
        startX = Math.random() * hero.clientWidth;
        startY = Math.random() * hero.clientHeight;
    }
    
    avatar.style.left = startX + 'px';
    avatar.style.top = startY + 'px';
    hero.appendChild(avatar);
    
    cofoundersRef.current.push({
      element: avatar,
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      opacity: 1,
      phase: 'floating',
      avatar: avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)]
    });
  };

  const createParticles = () => {
    if (!heroRef.current) return;
    
    const numParticles = 25;
    const hero = heroRef.current;
    
    for (let i = 0; i < numParticles; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute w-1 h-1 bg-white/60 rounded-full pointer-events-none transition-all duration-300 z-10';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      hero.appendChild(particle);
      
      particlesRef.current.push({
        element: particle,
        x: Math.random() * hero.clientWidth,
        y: Math.random() * hero.clientHeight,
        baseX: Math.random() * hero.clientWidth,
        baseY: Math.random() * hero.clientHeight
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });

    // Particle interaction
    particlesRef.current.forEach(particle => {
      const dx = x - particle.baseX;
      const dy = y - particle.baseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 150;
      
      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        const angle = Math.atan2(dy, dx);
        
        particle.x = particle.baseX - Math.cos(angle) * force * 30;
        particle.y = particle.baseY - Math.sin(angle) * force * 30;
      } else {
        particle.x += (particle.baseX - particle.x) * 0.1;
        particle.y += (particle.baseY - particle.y) * 0.1;
      }
      
      particle.element.style.transform = `translate(${particle.x - particle.baseX}px, ${particle.y - particle.baseY}px)`;
      
      const brightness = Math.max(0.3, 1 - distance / maxDistance);
      particle.element.style.opacity = brightness.toString();
    });
  };

  const scrollToMainContent = () => {
    mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleJoinGroup = (groupId: string) => {
    setGroups(groups.map(group => 
      group.id === groupId 
        ? { ...group, joined: !group.joined }
        : group
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This is now handled by CreateGroupModal
  };

  const handleCreateGroupSuccess = () => {
    console.log('🎉 App.tsx: handleCreateGroupSuccess called');
    // Add a small delay to ensure database consistency before refreshing
    setTimeout(() => {
      console.log('🔄 App.tsx: Refreshing groups after create success');
      fetchGroups(); // Refresh the groups list
    }, 500);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAuthSuccess = () => {
    console.log('🔐 App.tsx: handleAuthSuccess called');
    // Refresh or update UI after successful auth
    console.log('Authentication successful');
  };

  const handleShowProfile = () => {
    setShowProfile(true);
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
  };

  const handleCreateGroupFromProfile = () => {
    if (!user) return;
    
    setShowProfile(false);
    
    setIsCreateModalOpen(true);
  };

  const handleViewGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  const handleBackFromGroupDetails = () => {
    setSelectedGroupId(null);
  };

  const handleBackFromGroupProfile = () => {
    setSelectedGroupId(null);
    setShowGroupProfile(false);
  };

  const handleGroupDataUpdated = (groupId: string) => {
    console.log('Group data updated for group:', groupId);
    // Refresh the groups list to show updated member counts
    fetchGroups();
  };

  const handleShowSiteSettings = () => {
    setShowSiteSettings(true);
  };

  const handleBackFromSiteSettings = () => {
    setShowSiteSettings(false);
  };

  const handleShowPrivacyPolicy = () => {
    setShowPrivacyPolicy(true);
  };

  const handleBackFromPrivacyPolicy = () => {
    setShowPrivacyPolicy(false);
  };

  const handleShowTermsOfService = () => {
    setShowTermsOfService(true);
  };

  const handleBackFromTermsOfService = () => {
    setShowTermsOfService(false);
  };

  const handleShowCookiePolicy = () => {
    setShowCookiePolicy(true);
  };

  const handleBackFromCookiePolicy = () => {
    setShowCookiePolicy(false);
  };

  const handleShowPricing = () => {
    setShowPricingModal(true);
  };

  const handleBackFromStripeSuccess = () => {
    setShowStripeSuccess(false);
    setStripeSessionId(null);
    // Refresh user subscription data
    fetchUserSubscription();
  };

  const handleBackFromStripeCancel = () => {
    setShowStripeCancel(false);
  };

  const handleManageGroup = (groupId: string) => {
    console.log('App.tsx: handleManageGroup called with groupId:', groupId);
    setSelectedGroupId(groupId);
    setShowGroupProfile(true);
    setShowProfile(false);
  };

  const handleGroupCardClick = (e: React.MouseEvent, group: GroupData) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"], input, select, textarea')) {
      return;
    }

    if (isGroupOwner(group) || group.joined) {
      navigate(`/groups/${group.slug}/manage`);
    } else {
      navigate(`/groups/${group.slug}`);
    }
  };

  const isGroupMember = (groupId: string) => {
    // This would need to be implemented to check if user is a member
    // For now, we'll rely on the existing joined status
    return false;
  };

  const isGroupOwner = (group: GroupData) => {
    // For real groups, check if current user is the creator
    if (user && !group.id.startsWith('sample-')) {
      return (group as any).creator_id === user.id;
    }
    return false;
  };

  const dismissAnnouncement = () => {
    setIsAnnouncementDismissed(true);
    localStorage.setItem('announcementDismissed', 'true');
  };

  const dismissImportantMessage = () => {
    setIsImportantMessageDismissed(true);
    localStorage.setItem('importantMessageDismissed', 'true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-lg mx-auto">
            <h3 className="text-red-900 font-semibold mb-2">Connection Error</h3>
            <p className="text-red-800 text-sm whitespace-pre-line">{authError}</p>
            <div className="mt-3 text-xs text-red-700">
              <p className="font-medium mb-1">Common causes:</p>
              <ol className="list-decimal list-inside space-y-1 text-left ml-4">
                <li>Supabase project is paused (most common)</li>
                <li>Internet connection issues</li>
                <li>Incorrect Supabase credentials in .env file</li>
                <li>Firewall or network restrictions</li>
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Site Announcement Banner */}
      {siteAnnouncementEnabled && siteAnnouncementText && !isAnnouncementDismissed && (
        <div
          ref={() => {
            if (!bannerPulseTriggered.current) {
              bannerPulseTriggered.current = true;
              setBannerPulsing(true);
              setTimeout(() => setBannerPulsing(false), 3600);
            }
          }}
          className={`bg-blue-600 text-white text-center p-2 text-sm font-medium flex items-center justify-center relative${bannerPulsing ? ' banner-pulse' : ''}`}
        >
          <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-4">
            {siteAnnouncementText}
          </p>
          <button
            onClick={dismissAnnouncement}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-blue-100 transition-colors p-1 rounded-full"
            aria-label="Dismiss announcement"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Important Message Banner */}
      {importantMessageEnabled && importantMessageText && !isImportantMessageDismissed && (
        <div className="bg-slate-100 text-slate-700 text-center px-4 py-3 text-sm flex items-start justify-center relative border-b border-slate-200">
          <p className="max-w-3xl leading-relaxed text-left sm:text-center">
            {importantMessageText}
          </p>
          <button
            onClick={dismissImportantMessage}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full"
            aria-label="Dismiss important message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <Routes>
        {/* Blog Routes */}
        <Route path="/blog" element={<BlogListPage siteLogoUrl={siteLogoUrl} />} />
        <Route path="/blog/:slug" element={<BlogPostPage siteLogoUrl={siteLogoUrl} />} />

        {/* About Route */}
        <Route path="/about" element={<AboutPage siteLogoUrl={siteLogoUrl} />} />

        {/* Group Routes */}
        <Route
          path="/groups"
          element={
            <GroupsListPage
              siteLogoUrl={siteLogoUrl}
              userSubscription={userSubscription}
              onShowAuthModal={() => setIsAuthModalOpen(true)}
              onShowPricingModal={() => setShowPricingModal(true)}
              onCreateGroup={() => {
                if (!user) {
                  setIsAuthModalOpen(true);
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
            />
          }
        />
        <Route
          path="/groups/:slug"
          element={
            <GroupDetailsRoute
              userSubscription={userSubscription}
              onShowAuthModal={() => setIsAuthModalOpen(true)}
              onShowPricingModal={() => setShowPricingModal(true)}
            />
          }
        />
        <Route
          path="/groups/:slug/manage"
          element={<GroupProfileRoute siteLogoUrl={siteLogoUrl} />}
        />

        {/* Legacy group redirect */}
        <Route path="/redirect" element={<LegacyGroupRedirect />} />

        {/* Payment Routes */}
        <Route
          path="/payment/success"
          element={<PaymentSuccessRoute />}
        />
        <Route
          path="/payment/cancelled"
          element={<PaymentCancelRoute onShowPricingModal={() => setShowPricingModal(true)} />}
        />

        {/* Password Reset Routes */}
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage siteLogoUrl={siteLogoUrl} />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage siteLogoUrl={siteLogoUrl} />}
        />

        {/* Policy Pages */}
        <Route
          path="/privacy"
          element={
            <PrivacyPolicyPage
              onBack={() => navigate('/')}
              siteLogoUrl={siteLogoUrl}
            />
          }
        />
        <Route
          path="/terms"
          element={
            <TermsOfServicePage
              onBack={() => navigate('/')}
              siteLogoUrl={siteLogoUrl}
            />
          }
        />
        <Route
          path="/cookies"
          element={
            <CookiePolicyPage
              onBack={() => navigate('/')}
              siteLogoUrl={siteLogoUrl}
            />
          }
        />

        {/* How It Works */}
        <Route
          path="/how-it-works"
          element={
            <HowItWorksPage
              onBack={() => navigate('/')}
              siteLogoUrl={siteLogoUrl}
            />
          }
        />

        {/* Profile (Protected) */}
        <Route
          path="/profile"
          element={
            user ? (
              <ProfilePage
                onBack={() => navigate('/')}
                onViewJoinedGroup={(groupId) => {
                  groupAPI.getGroup(groupId).then(g => navigate(`/groups/${g.slug}/manage`));
                }}
                onCreateGroup={() => setIsCreateModalOpen(true)}
                siteLogoUrl={siteLogoUrl}
                userSubscription={userSubscription}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Site Settings (Admin Only) */}
        <Route
          path="/settings"
          element={
            user && isUserSiteAdmin ? (
              <SiteSettingsPage onBack={() => navigate('/')} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Home Page Route */}
        <Route
          path="/"
          element={
            <>
          <Helmet>
            <title>EquityTake - Connect with Co-Founders & Build Startups Together</title>
            <meta name="description" content="Join EquityTake to find co-founders, create startup groups, and claim equity in innovative ventures. Build your dream team and launch your startup today." />
            <link rel="canonical" href={window.location.origin} />

            {/* Open Graph tags for social sharing */}
            <meta property="og:title" content="EquityTake - Connect with Co-Founders & Build Startups" />
            <meta property="og:description" content="Join EquityTake to find co-founders, create startup groups, and claim equity in innovative ventures." />
            <meta property="og:url" content={window.location.origin} />
            <meta property="og:type" content="website" />
            {siteLogoUrl && <meta property="og:image" content={siteLogoUrl} />}

            {/* Twitter Card tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="EquityTake - Connect with Co-Founders & Build Startups" />
            <meta name="twitter:description" content="Join EquityTake to find co-founders, create startup groups, and claim equity in innovative ventures." />
            {siteLogoUrl && <meta name="twitter:image" content={siteLogoUrl} />}
          </Helmet>

          {/* Header */}
          <header className="bg-white border-b border-slate-200 py-3 sticky top-0 z-50 shadow-sm">
            <nav className="max-w-6xl mx-auto px-4 flex justify-between items-center">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToMainContent();
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
                      console.warn('Logo failed to load. URL was:', siteLogoUrl);
                      console.warn('This indicates a storage policy issue. The site-logos bucket needs public read access.');
                      console.warn('To fix: Go to Supabase Dashboard → Storage → site-logos → Policies');
                      console.warn('Create a policy: SELECT for anon role with condition: bucket_id = \'site-logos\'');
                      setSiteLogoUrl(null);
                    }}
                    onLoad={() => {
                      console.log('Logo loaded successfully:', siteLogoUrl);
                    }}
                  />
                ) : null}
              </a>
              <div className="flex gap-2 items-center">
                <Link
                  to="/"
                  className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/how-it-works"
                  className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  to="/blog"
                  className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Blog
                </Link>
                <Link
                  to="/about"
                  className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors"
                >
                  About
                </Link>
                {user ? (
                  <div className="flex items-center gap-2">
                    {(() => {
                      console.log('🎨 Header render: user exists:', !!user);
                      console.log('🎨 Header render: isUserSiteAdmin:', isUserSiteAdmin);
                      console.log('🎨 Header render: Should show settings button:', user && isUserSiteAdmin);
                      return null;
                    })()}
                    {user && isUserSiteAdmin && (
                      <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Site Settings"
                      >
                        <Settings size={14} className="text-slate-600" />
                        <span className="text-xs font-medium text-slate-700">
                          Settings
                        </span>
                      </button>
                    )}
{/* Premium Status Indicator - hidden, infrastructure preserved */}
                    <button
                      onClick={() => navigate('/profile')}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <UserCircle size={14} className="text-slate-600" />
                      <span className="text-xs font-medium text-slate-700">
                        Profile
                      </span>
                    </button>
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-3 py-2 rounded-lg font-semibold text-xs bg-orange-600 text-white hover:bg-red-600 transition-colors"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </nav>
          </header>

          {/* Hero Section */}
          <section 
            ref={heroRef}
            className="relative bg-gradient-to-br from-slate-900 to-slate-700 text-white py-12 overflow-hidden"
            onMouseMove={handleMouseMove}
          >
            {/* Cursor following light effect */}
            <div 
              className="absolute w-72 h-72 rounded-full pointer-events-none transition-all duration-100 z-10"
              style={{
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(236, 72, 153, 0.1) 40%, transparent 70%)',
                left: mousePosition.x,
                top: mousePosition.y,
                transform: 'translate(-50%, -50%)'
              }}
            />

            <div className="relative z-20 max-w-6xl mx-auto px-4 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                Build Startups Together
              </h1>
              <p className="text-base mb-6 text-slate-300 max-w-2xl mx-auto">
                Connect with co-founders, claim equity, and turn your startup ideas into reality through collaborative groups
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={scrollToMainContent}
                  className="px-5 py-2.5 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-red-600 hover:-translate-y-0.5 transition-all"
                >
                  Browse Startups
                </button>
                <button 
                  onClick={() => {
                    if (!user) {
                      setInitialAuthModeSignUp(true);
                      setIsAuthModalOpen(true);
                    } else {
                      setIsCreateModalOpen(true);
                    }
                  }}
                  className="px-5 py-2.5 text-sm font-semibold border border-white/30 text-white rounded-lg hover:bg-white/10 hover:-translate-y-0.5 transition-all"
                  style={{ backgroundColor: '#FF69B4' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF69B4'}
                >
                  Create Group
                </button>
              </div>
            </div>
          </section>

          {/* Main Content */}
          <main ref={mainContentRef} className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2 text-slate-900">
                  Active Startup Groups
                </h2>
                <p className="text-sm text-slate-600">
                  Join these innovative startups and claim your equity stake
                </p>
              </div>

              {groupsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading groups...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((group) => (
                    <div 
                      key={group.id}
                      className="relative border border-slate-200 rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-blue-500 transition-all duration-200 cursor-pointer"
                      onClick={(e) => handleGroupCardClick(e, group)}
                      style={{
                        backgroundImage: group.cover_image ? `url(${group.cover_image})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: group.cover_image ? undefined : '#ffffff'
                      }}
                    >
                      {/* Overlay for better text readability */}
                      <div className={`absolute inset-0 ${group.cover_image ? 'bg-black/5' : 'bg-transparent'} rounded-xl pointer-events-none`}></div>
                      
                      {/* Content container - pointer-events-none so clicks pass through to card or buttons */}
                      <div className={`relative p-4 ${group.cover_image ? 'bg-white/60' : 'bg-transparent'} rounded-xl h-full pointer-events-none`}>
                        <div className="mb-3">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {group.name}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {group.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <span className="text-base font-bold text-emerald-600 block">
                              {group.equityAvailable}%
                            </span>
                            <span className="text-xs text-slate-600 uppercase tracking-wide mt-1">
                              Equity Available
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <span className="text-base font-bold text-red-600 block">
                              {group.fundingNeeded}
                            </span>
                            <span className="text-xs text-slate-600 uppercase tracking-wide mt-1">
                              Funding Needed
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-semibold">
                              {group.industry}
                            </span>
                           <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                             (group as any).stage === 'funding' 
                               ? 'bg-purple-100 text-purple-800' 
                               : 'bg-green-100 text-green-800'
                           }`}>
                             {(group as any).stage === 'funding' ? 'Funding' : 'Pre-Inc'}
                           </span>
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                              group.is_public 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {group.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                          <span className="text-slate-600 text-xs">
                            {group.currentMembers}/{group.maxMembers} co-founders
                          </span>
                        </div>
                          
                          {/* Legal Structure & Org Type Badges */}
                          <div className="flex flex-wrap gap-1 pt-2">
                            <span
                              title="Legal structure — the current or planned legal structure of this startup."
                              className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium"
                            >
                              <Landmark size={11} className="shrink-0" aria-label="Legal structure" />
                              <span className="font-semibold text-slate-500">Legal:</span>
                              {formatLegalStructure(group.legal_structure)}
                            </span>
                            <span
                              title="Organisation type — whether the group is planning a for-profit or non-profit organisation."
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                group.organisation_type === 'for_profit'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : group.organisation_type === 'non_profit'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <Briefcase size={11} className="shrink-0" aria-label="Organisation type" />
                              <span className="font-semibold opacity-70">Type:</span>
                              {formatOrganisationType(group.organisation_type)}
                            </span>
                          </div>

                          {/* Location Information */}
                          <div className="flex items-center gap-1 pt-2 pb-12">
                            <span className="text-xs">📍</span>
                            <span className="text-xs text-slate-600">
                              {(() => {
                                const groupData = group as any;
                                if (groupData.location_type === 'location_based') {
                                  if (groupData.city && groupData.country) {
                                    return `${groupData.city}, ${groupData.country}`;
                                  } else if (groupData.country) {
                                    return groupData.country;
                                  } else {
                                    return 'Location-based';
                                  }
                                }
                                return 'Worldwide';
                              })()}
                            </span>
                          </div>
                      </div>

                      {/* Button container - positioned outside content for proper click handling */}
                      <div className="absolute bottom-4 right-4 z-50 isolate pointer-events-auto">
                        {isGroupOwner(group) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              navigate(`/groups/${group.slug}/manage`);
                            }}
                            className="px-3 py-1.5 rounded-lg font-semibold text-xs transition-all hover:scale-105 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer relative z-[100]"
                          >
                            Manage
                          </button>
                        ) : group.joined ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              navigate(`/groups/${group.slug}/manage`);
                            }}
                            className="px-3 py-1.5 rounded-lg font-semibold text-xs transition-all hover:scale-105 bg-green-600 text-white hover:bg-green-700 cursor-pointer relative z-[100]"
                          >
                            Visit Group
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              navigate(`/groups/${group.slug}`);
                            }}
                            className="px-3 py-1.5 rounded-lg font-semibold text-xs transition-all hover:scale-105 bg-slate-600 text-white hover:bg-slate-700 cursor-pointer relative z-[100]"
                          >
                            See More
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* Floating Action Button */}
          <button 
            onClick={() => {
              if (!user) {
                setInitialAuthModeSignUp(true);
                setIsAuthModalOpen(true);
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            className="fixed bottom-6 right-6 w-12 h-12 text-white rounded-full shadow-lg hover:scale-110 transition-all z-50 flex items-center justify-center"
            style={{ backgroundColor: '#FF69B4' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF69B4'}
          >
            <Plus size={20} />
          </button>

          {/* Footer */}
          <Footer
            siteLogoUrl={siteLogoUrl}
            user={user}
            userSubscription={userSubscription}
            setIsCreateModalOpen={setIsCreateModalOpen}
            setShowProfile={setShowProfile}
            setIsAuthModalOpen={setIsAuthModalOpen}
            onShowPrivacyPolicy={handleShowPrivacyPolicy}
            onShowTermsOfService={handleShowTermsOfService}
            onShowCookiePolicy={handleShowCookiePolicy}
            onShowBlogAndAbout={() => navigate('/blog')}
            onShowHowItWorks={() => navigate('/how-it-works')}
          />
            </>
          }
        />
      </Routes>

      {/* Modals - Always rendered so they can appear on any page */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateGroupSuccess}
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setInitialAuthModeSignUp(false);
        }}
        onAuthSuccess={handleAuthSuccess}
        initialIsSignUp={initialAuthModeSignUp}
      />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onShowTerms={() => {
          setShowPricingModal(false);
          navigate('/terms');
        }}
        hasHadSubscription={userSubscription?.subscription_status && userSubscription.subscription_status !== 'active'}
      />

      <PricingInfoModal
        isOpen={showPricingInfoModal}
        onClose={() => setShowPricingInfoModal(false)}
        onUpgrade={() => {
          setShowPricingInfoModal(false);
          setShowPricingModal(true);
        }}
      />

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      <AiSupportWidget />
    </div>
  );
};

export default App;