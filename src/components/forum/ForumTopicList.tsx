import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Pin, Lock, Eye, Calendar, User, Search, Filter } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { forumAPI, ForumTopic } from '../../lib/forumApi';

interface ForumTopicListProps {
  groupId: string;
  onTopicSelect: (topicId: string) => void;
  onCreateTopic: () => void;
  canCreateTopics: boolean;
}

const ForumTopicList: React.FC<ForumTopicListProps> = ({
  groupId,
  onTopicSelect,
  onCreateTopic,
  canCreateTopics
}) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'last_post_at' | 'created_at' | 'views_count'>('last_post_at');

  useEffect(() => {
    fetchTopics();
  }, [groupId, searchQuery, sortBy]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const fetchedTopics = await forumAPI.getTopics(groupId, {
        search: searchQuery || undefined,
        sortBy,
        sortOrder: 'desc',
        limit: 50
      });
      setTopics(fetchedTopics);
    } catch (error) {
      console.error('Error fetching forum topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return formatDate(dateString);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Forum Discussions ({topics.length})
        </h3>
        {canCreateTopics && (
          <button
            onClick={onCreateTopic}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
            style={{ backgroundColor: '#FF69B4' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF69B4'}
          >
            <Plus size={16} />
            New Topic
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
        >
          <option value="last_post_at">Latest Activity</option>
          <option value="created_at">Newest First</option>
          <option value="views_count">Most Viewed</option>
        </select>
      </div>

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">No discussions yet</h4>
          <p className="text-slate-600 mb-4">
            {searchQuery ? 'No topics match your search.' : 'Be the first to start a discussion!'}
          </p>
          {canCreateTopics && !searchQuery && (
            <button
              onClick={onCreateTopic}
              className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
              style={{ backgroundColor: '#FF69B4' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF69B4'}
            >
              Create First Topic
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
            <div
              key={topic.id}
              onClick={() => onTopicSelect(topic.id)}
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {topic.is_pinned && (
                      <Pin size={14} className="text-blue-600 fill-current" />
                    )}
                    {topic.is_locked && (
                      <Lock size={14} className="text-red-600" />
                    )}
                    <h4 className="font-semibold text-slate-900 truncate">
                      {topic.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>{topic.creator_profile?.username || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(topic.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{topic.views_count} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      <span>{topic.posts_count || 0} posts</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm text-slate-500 ml-4">
                  <div>Last activity</div>
                  <div className="font-medium">{formatTime(topic.last_post_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ForumTopicList;