import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import GroupDetailsPage from '../components/GroupDetailsPage';
import { groupAPI } from '../lib/groupApi';
import { stripeAPI } from '../lib/stripeApi';
import { useAuth } from '../hooks/useAuth';
import { EXISTING_USER_CUTOFF_DATE } from '../App';

interface GroupDetailsRouteProps {
  onShowAuthModal: () => void;
  onShowPricingModal: () => void;
}

const GroupDetailsRoute: React.FC<GroupDetailsRouteProps> = ({
  onShowAuthModal,
  onShowPricingModal
}) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    if (slug) {
      loadGroupBySlug(slug);
    }
  }, [slug]);

  useEffect(() => {
    if (user) {
      fetchUserSubscription();
    }
  }, [user]);

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

  const loadGroupBySlug = async (groupSlug: string) => {
    setLoading(true);
    try {
      const group = await groupAPI.getGroupBySlug(groupSlug);
      if (group) {
        setGroupId(group.id);
        setGroupData(group);
      } else {
        // Group not found, redirect to home
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading group:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleCreateGroup = () => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    // Check if user is existing (before cutoff) or new (after cutoff)
    const userCreatedAt = new Date(user.created_at);
    const isExistingUser = userCreatedAt < EXISTING_USER_CUTOFF_DATE;

    if (isExistingUser || userSubscription?.subscription_status === 'active') {
      navigate('/');
      // The parent App component will handle opening the create modal
    } else {
      onShowPricingModal();
    }
  };

  const handleViewGroupProfile = (groupId: string) => {
    // Find group by ID and navigate to its slug
    groupAPI.getGroup(groupId).then(group => {
      if (group.slug) {
        navigate(`/groups/${group.slug}/manage`);
      }
    });
  };

  const handleGroupDataUpdated = () => {
    // Refresh data if needed
    if (slug) {
      loadGroupBySlug(slug);
    }
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

  if (!groupId) {
    return null;
  }

  const groupName = groupData?.name || '';
  const groupDescription = groupData?.description || `Join ${groupName} on EquityTake - connect with co-founders and build startups together`;
  const groupCoverImage = groupData?.cover_image || null;
  const groupIndustry = groupData?.industry || '';
  const groupEquity = groupData?.equity_available;
  const groupFunding = groupData?.funding_needed || '';
  const groupUrl = `${window.location.origin}/groups/${slug}`;
  const defaultShareImage = `${window.location.origin}/social-share-default.png`;

  const shareDescription = groupData
    ? `${groupDescription.slice(0, 140)}${groupDescription.length > 140 ? '...' : ''}${groupIndustry ? ` | Industry: ${groupIndustry}` : ''}${groupEquity ? ` | ${groupEquity}% equity available` : ''}${groupFunding ? ` | Funding: ${groupFunding}` : ''}`
    : `Join ${groupName} on EquityTake - connect with co-founders and build startups together`;
  const shareImage = groupCoverImage || defaultShareImage;

  return (
    <>
      <Helmet>
        <title>{groupName} | EquityTake</title>
        <meta name="description" content={shareDescription} />
        <link rel="canonical" href={groupUrl} />

        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content={`${groupName} | EquityTake`} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:url" content={groupUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="EquityTake" />
        <meta property="og:image" content={shareImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${groupName} | EquityTake`} />
        <meta name="twitter:description" content={shareDescription} />
        <meta name="twitter:image" content={shareImage} />
      </Helmet>
      <GroupDetailsPage
        groupId={groupId}
        onBack={handleBack}
        userSubscription={userSubscription}
        onShowAuthModal={onShowAuthModal}
        onShowPricingModal={onShowPricingModal}
        onCreateGroup={handleCreateGroup}
        onViewGroupProfile={handleViewGroupProfile}
        onGroupDataUpdated={handleGroupDataUpdated}
      />
    </>
  );
};

export default GroupDetailsRoute;
