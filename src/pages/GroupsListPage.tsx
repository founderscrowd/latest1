import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Plus, Landmark, Coins } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { groupAPI, formatLegalStructure, formatOrganisationType } from '../lib/groupApi';
import Footer from '../components/Footer';

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
  creator_subscription_active?: boolean;
  is_public: boolean;
  cover_image?: string;
  location_type?: string;
  country?: string;
  city?: string;
  stage?: string;
  legal_structure?: string;
  organisation_type?: string;
}

interface GroupsListPageProps {
  siteLogoUrl: string | null;
  userSubscription?: any;
  onShowAuthModal: () => void;
  onShowPricingModal: () => void;
  onCreateGroup: () => void;
}

const GroupsListPage: React.FC<GroupsListPageProps> = ({
  siteLogoUrl,
  userSubscription,
  onShowAuthModal,
  onShowPricingModal,
  onCreateGroup
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const fetchedGroups = await groupAPI.getGroups({ limit: 50 });

      const transformedGroups = await Promise.all(
        fetchedGroups.map(async (group) => {
          let isJoined = false;

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
            creator_id: group.creator_id,
            creator_subscription_active: group.creator_subscription_active,
            creator_username: group.creator_profile?.username || 'Unknown',
            is_public: group.is_public,
            cover_image: group.cover_image,
            location_type: group.location_type,
            country: group.country,
            city: group.city,
            stage: group.stage,
            legal_structure: group.legal_structure,
            organisation_type: group.organisation_type
          };
        })
      );

      setGroups(transformedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const isGroupOwner = (group: GroupData) => {
    if (user && !group.id.startsWith('sample-')) {
      return group.creator_id === user.id;
    }
    return false;
  };

  const handleGroupCardClick = (e: React.MouseEvent, group: GroupData) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    if (isGroupOwner(group) || group.joined) {
      navigate(`/groups/${group.slug}/manage`);
    } else {
      navigate(`/groups/${group.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet>
        <title>Browse Startup Groups - EquityTake</title>
        <meta name="description" content="Browse and join innovative startup groups. Find co-founders and claim equity in exciting ventures." />
        <link rel="canonical" href={`${window.location.origin}/groups`} />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to Home</span>
              </button>
              {siteLogoUrl && (
                <Link to="/">
                  <img
                    src={siteLogoUrl}
                    alt="Site Logo"
                    className="h-10 object-contain"
                  />
                </Link>
              )}
            </div>

            {user && (
              <button
                onClick={onCreateGroup}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold text-sm"
              >
                <Plus size={18} />
                Create Group
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-3 text-slate-900">
              Browse Startup Groups
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Join these innovative startups and claim your equity stake. Connect with co-founders and turn your startup ideas into reality.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No groups found yet. Be the first to create one!</p>
              {user && (
                <button
                  onClick={onCreateGroup}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                  Create First Group
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="relative border border-slate-200 rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-blue-500 transition-all duration-200 cursor-pointer bg-white"
                  onClick={(e) => handleGroupCardClick(e, group)}
                  style={{
                    backgroundImage: group.cover_image ? `url(${group.cover_image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {group.cover_image && (
                    <div className="absolute inset-0 bg-black/5 rounded-xl pointer-events-none"></div>
                  )}

                  <div className={`relative z-10 p-5 ${group.cover_image ? 'bg-white/80 backdrop-blur-sm' : ''} rounded-xl h-full`}>
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {group.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {group.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      {group.tags.length > 3 && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
                          +{group.tags.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                        <span className="text-base font-bold text-emerald-600 block">
                          {group.equityAvailable}%
                        </span>
                        <span className="text-xs text-slate-600 uppercase tracking-wide">
                          Equity
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                        <span className="text-base font-bold text-red-600 block">
                          {group.fundingNeeded}
                        </span>
                        <span className="text-xs text-slate-600 uppercase tracking-wide">
                          Funding
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-semibold">
                        {group.industry}
                      </span>
                      {group.stage && (
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          group.stage === 'funding'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {group.stage === 'funding' ? 'Funding' : 'Pre-Inc'}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        group.is_public
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {group.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>

                    {/* Organisation Badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span
                        title="Profit status — whether the group is planning a for-profit or non-profit organisation."
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          group.organisation_type === 'for_profit'
                            ? 'bg-emerald-50 text-emerald-700'
                            : group.organisation_type === 'non_profit'
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Coins size={11} className="shrink-0" aria-label="Profit status" />
                        {formatOrganisationType(group.organisation_type)}
                      </span>
                      <span
                        title="Organisation structure — the current or planned legal structure of this startup."
                        className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium"
                      >
                        <Landmark size={11} className="shrink-0" aria-label="Organisation structure" />
                        {formatLegalStructure(group.legal_structure)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pb-12">
                      <span>
                        {group.currentMembers}/{group.maxMembers} co-founders
                        {group.creator_subscription_active === false && (
                          <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                            Inactive Starter
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        <span>
                          {group.location_type === 'location_based'
                            ? (group.city && group.country
                                ? `${group.city}, ${group.country}`
                                : group.country || 'Location-based')
                            : 'Worldwide'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Button container - positioned outside content for proper click handling */}
                  <div className="absolute bottom-4 right-4 z-50 isolate">
                    {isGroupOwner(group) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/groups/${group.slug}/manage`);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-4 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                      >
                        Manage
                      </button>
                    ) : group.joined ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/groups/${group.slug}/manage`);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-4 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105 bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                      >
                        Visit Group
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/groups/${group.slug}`);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-4 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105 bg-slate-600 text-white hover:bg-slate-700 cursor-pointer"
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

      {/* Footer */}
      <Footer
        siteLogoUrl={siteLogoUrl}
        user={user}
        userSubscription={userSubscription}
        setIsCreateModalOpen={onCreateGroup}
        setShowProfile={() => navigate('/profile')}
        setIsAuthModalOpen={onShowAuthModal}
        onShowPrivacyPolicy={() => navigate('/privacy')}
        onShowTermsOfService={() => navigate('/terms')}
        onShowCookiePolicy={() => navigate('/cookies')}
        onShowBlogAndAbout={() => navigate('/blog')}
        onShowHowItWorks={() => navigate('/how-it-works')}
      />
    </div>
  );
};

export default GroupsListPage;
