import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { groupAPI } from '../lib/groupApi';

const LegacyGroupRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const groupId = searchParams.get('group');

    if (groupId) {
      redirectToSlug(groupId);
    } else {
      // No group parameter, redirect to home
      navigate('/', { replace: true });
    }
  }, [searchParams]);

  const redirectToSlug = async (groupId: string) => {
    try {
      const group = await groupAPI.getGroup(groupId);
      if (group && group.slug) {
        // Redirect to new slug-based URL
        navigate(`/groups/${group.slug}`, { replace: true });
      } else {
        // Group not found, redirect to home
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error redirecting legacy group URL:', error);
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LegacyGroupRedirect;
