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
  const [groupName, setGroupName] = useState<string>('');
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
        setGroupName(group.name);
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

  return (
    <>
      <Helmet>
        <title>{groupName} | EquityTake</title>
        <meta name="description" content={`Join ${groupName} on EquityTake - connect with co-founders and build startups together`} />
        <link rel="canonical" href={`${window.location.origin}/groups/${slug}`} />
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
