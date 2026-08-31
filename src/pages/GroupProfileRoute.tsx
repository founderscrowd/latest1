import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import GroupProfilePage from '../components/GroupProfilePage';
import { groupAPI } from '../lib/groupApi';

interface GroupProfileRouteProps {
  siteLogoUrl: string | null;
}

const GroupProfileRoute: React.FC<GroupProfileRouteProps> = ({ siteLogoUrl }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadGroupBySlug(slug);
    }
  }, [slug]);

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

  const handleShowProfile = () => {
    navigate('/profile');
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
        <title>Manage {groupName} | EquityTake</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <GroupProfilePage
        groupId={groupId}
        onBack={handleBack}
        siteLogoUrl={siteLogoUrl}
        onShowProfile={handleShowProfile}
      />
    </>
  );
};

export default GroupProfileRoute;
