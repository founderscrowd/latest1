import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, User, Calendar, Edit2, Trash2, Reply, Pin, Lock, Paperclip, Image, File, Download, Eye, AlertTriangle, Clock, Users, Maximize2, Minimize2, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { forumAPI, ForumTopic, ForumPost } from '../../lib/forumApi';
import ConfirmationModal from '../ConfirmationModal';

interface ForumTopicViewProps {
  topicId: string;
  onBack: () => void;
  canModerate: boolean;
  onToggleFullScreen?: () => void;
  isFullScreen?: boolean;
}

const ForumTopicView: React.FC<ForumTopicViewProps> = ({
  topicId,
  onBack,
  canModerate,
  onToggleFullScreen,
  isFullScreen = false
}) => {
  const { user } = useAuth();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteTopicConfirm, setShowDeleteTopicConfirm] = useState(false);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState('');
  const [deletingTopic, setDeletingTopic] = useState(false);
  const [topicStats, setTopicStats] = useState<{
    postsCount: number;
    participantsCount: number;
    createdHoursAgo: number;
    hasOtherParticipants: boolean;
  } | null>(null);

  useEffect(() => {
    fetchTopicData();
    fetchTopicStats();
    
    // Increment view count
    if (topicId) {
      forumAPI.incrementTopicViews(topicId);
    }

    // Subscribe to new posts
    const unsubscribe = forumAPI.subscribeToNewPosts(topicId, (newPost) => {
      setPosts(prev => [...prev, newPost]);
      // Update stats when new posts arrive
      fetchTopicStats();
    });

    return () => unsubscribe();
  }, [topicId]);

  const fetchTopicData = async () => {
    try {
      setLoading(true);
      const [topicData, postsData] = await Promise.all([
        forumAPI.getTopic(topicId),
        forumAPI.getPosts(topicId, { sortBy: 'created_at', sortOrder: 'asc' })
      ]);
      
      setTopic(topicData);
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching topic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicStats = async () => {
    try {
      const stats = await forumAPI.getTopicStats(topicId);
      setTopicStats(stats);
    } catch (error) {
      console.error('Error fetching topic stats:', error);
    }
  };

  const handleDeleteTopic = async () => {
    if (!user || !topic) return;

    // Generate appropriate warning message based on topic stats
    let warningMessage = `Are you sure you want to delete the topic "${topic.title}"?`;
    
    if (topicStats) {
      const { postsCount, participantsCount, createdHoursAgo, hasOtherParticipants } = topicStats;
      
      if (hasOtherParticipants) {
        warningMessage = `⚠️ WARNING: This topic has ${postsCount} posts from ${participantsCount} different users.

Deleting this topic will:
• Remove all ${postsCount} posts permanently
• Delete all file attachments
• Remove the discussion history for ${participantsCount} participants

This action cannot be undone.

Are you sure you want to delete "${topic.title}"?`;
      } else if (postsCount > 1) {
        warningMessage = `This topic contains ${postsCount} posts. All posts and attachments will be permanently deleted.

Are you sure you want to delete "${topic.title}"?`;
      } else if (createdHoursAgo > 24) {
        warningMessage = `This topic was created ${Math.floor(createdHoursAgo / 24)} days ago. 

Are you sure you want to delete "${topic.title}"?`;
      }
    }

    setDeleteConfirmMessage(warningMessage);
    setShowDeleteTopicConfirm(true);
  };

  const handleConfirmDeleteTopic = async () => {
    if (!user || !topic) return;

    try {
      setDeletingTopic(true);
      await forumAPI.deleteTopic(topicId, user.id);
      
      // Navigate back to forum list after successful deletion
      onBack();
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      alert(error.message || 'Failed to delete topic. Please try again.');
    } finally {
      setDeletingTopic(false);
      setShowDeleteTopicConfirm(false);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      return allowedTypes.includes(file.type) && file.size <= maxSize;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image size={16} className="text-blue-600" />;
    } else if (fileType === 'application/pdf') {
      return <FileText size={16} className="text-red-600" />;
    } else {
      return <FileText size={16} className="text-slate-600" />;
    }
  };
  
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && selectedFiles.length === 0) || posting || !user) return;

    try {
      setPosting(true);
      const newPost = await forumAPI.createPost(
        topicId, 
        newPostContent.trim() || '[File attachment]', 
        user.id,
        selectedFiles.length > 0 ? selectedFiles : undefined
      );
      setPosts(prev => [...prev, newPost]);
      setNewPostContent('');
      setSelectedFiles([]);
      // Update stats after new post
      fetchTopicStats();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!editContent.trim() || !user) return;

    try {
      const updatedPost = await forumAPI.updatePost(postId, editContent.trim(), user.id);
      setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      setEditingPost(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?') || !user) return;

    try {
      await forumAPI.deletePost(postId, user.id);
      setPosts(prev => prev.filter(p => p.id !== postId));
      // Update stats after post deletion
      fetchTopicStats();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDeleteTopic = () => {
    if (!user || !topic) return false;
    
    // Topic creator can always delete (with warnings)
    if (topic.created_by === user.id) return true;
    
    // Group admins/starters can delete any topic
    return canModerate;
  };

  const getDeleteWarningLevel = (): 'low' | 'medium' | 'high' => {
    if (!topicStats) return 'low';
    
    const { postsCount, hasOtherParticipants, createdHoursAgo } = topicStats;
    
    // High risk: Multiple participants or many posts
    if (hasOtherParticipants && postsCount > 5) return 'high';
    if (postsCount > 10) return 'high';
    
    // Medium risk: Some engagement or older topic
    if (hasOtherParticipants || postsCount > 3 || createdHoursAgo > 24) return 'medium';
    
    // Low risk: New topic with minimal engagement
    return 'low';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Topic not found</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Topics
        </button>
      </div>
    );
  }

  const warningLevel = getDeleteWarningLevel();
  
  return (
    <div className={isFullScreen ? "fixed inset-0 z-50 bg-white overflow-y-auto" : "space-y-6"}>
      {isFullScreen && (
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Forum
            </button>
            <button
              onClick={onToggleFullScreen}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              title="Exit full screen"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        </div>
      )}
      
      <div className={`space-y-6 ${isFullScreen ? 'p-6' : ''}`}>
      {/* Header */}
      {!isFullScreen && (
        <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Topics
        </button>
        
        {/* Topic Actions */}
        {canDeleteTopic() && (
          <div className="flex items-center gap-2">
            {topicStats && (
              <div className="flex items-center gap-4 text-sm text-slate-600 mr-4">
                <div className="flex items-center gap-1">
                  <MessageSquare size={14} />
                  <span>{topicStats.postsCount} posts</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{topicStats.participantsCount} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>
                    {topicStats.createdHoursAgo < 1 
                      ? 'Just created' 
                      : topicStats.createdHoursAgo < 24 
                      ? `${Math.floor(topicStats.createdHoursAgo)}h ago`
                      : `${Math.floor(topicStats.createdHoursAgo / 24)}d ago`
                    }
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleDeleteTopic}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                warningLevel === 'high'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : warningLevel === 'medium'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-slate-600 text-white hover:bg-slate-700'
              }`}
              title={
                warningLevel === 'high' 
                  ? 'High impact deletion - multiple participants'
                  : warningLevel === 'medium'
                  ? 'Medium impact deletion - some engagement'
                  : 'Low impact deletion'
              }
            >
              {warningLevel === 'high' && <AlertTriangle size={16} />}
              <Trash2 size={16} />
              Delete Topic
            </button>
          </div>
        )}
        </div>
      )}

      {/* Topic Header */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {topic.is_pinned && (
                <Pin size={16} className="text-blue-600 fill-current" />
              )}
              {topic.is_locked && (
                <Lock size={16} className="text-red-600" />
              )}
              <h1 className="text-2xl font-bold text-slate-900">{topic.title}</h1>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>Started by {topic.creator_profile?.username || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{formatDate(topic.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare size={14} />
                <span>{posts.length} posts</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye size={14} />
                <span>{topic.views_count} views</span>
              </div>
            </div>
          </div>
          
          {/* Full Screen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              title={isFullScreen ? "Exit full screen" : "Expand to full screen"}
            >
              {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <div key={post.id} className="bg-white rounded-lg border border-slate-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {post.poster_profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {post.poster_profile?.username || 'Unknown User'}
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatDate(post.created_at)}
                      {post.edited_at && (
                        <span className="ml-2 text-slate-500">(edited)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {(post.posted_by === user?.id || canModerate) && (
                  <div className="flex items-center gap-2">
                    {post.posted_by === user?.id && (
                      <button
                        onClick={() => {
                          setEditingPost(post.id);
                          setEditContent(post.content);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit post"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete post"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              {editingPost === post.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-vertical min-h-[100px]"
                    placeholder="Edit your post..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditPost(post.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditingPost(null);
                        setEditContent('');
                      }}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>
              )}

                  {/* Attachments */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Paperclip size={14} />
                        Attachments ({post.attachments.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {post.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex-shrink-0">
                              {attachment.file_type.startsWith('image/') ? (
                                <Image size={20} className="text-blue-600" />
                              ) : attachment.file_type === 'application/pdf' ? (
                                <FileText size={20} className="text-red-600" />
                              ) : (
                                <FileText size={20} className="text-slate-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {attachment.file_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {formatFileSize(attachment.file_size)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {attachment.file_type.startsWith('image/') && (
                                <button
                                  onClick={() => window.open(attachment.file_url, '_blank')}
                                  className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                                  title="View image"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                              <a
                                href={attachment.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-600 hover:text-slate-700 transition-colors"
                                title="Download file"
                              >
                                <Download size={16} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
            </div>
            
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Post #{index + 1}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Post Form */}
      {user && !topic.is_locked && (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Reply to this topic</h3>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-vertical min-h-[120px]"
              placeholder="Write your reply..."
            />
            
            {/* File Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <Paperclip size={16} className="text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Add Files</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={posting}
                  />
                </label>
                <span className="text-xs text-slate-500">
                  Images, PDFs, Documents • Max 10MB each
                </span>
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Selected Files:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.type)}
                          <div>
                            <div className="text-sm font-medium text-slate-900 truncate max-w-32">
                              {file.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                          disabled={posting}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={posting || (!newPostContent.trim() && selectedFiles.length === 0)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? 'Posting...' : `Post Reply${selectedFiles.length > 0 ? ` (${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''})` : ''}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {topic.is_locked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <Lock size={20} className="text-yellow-600 mx-auto mb-2" />
          <p className="text-yellow-800 font-medium">This topic is locked</p>
          <p className="text-yellow-700 text-sm">No new replies can be posted.</p>
        </div>
      )}

      {/* Delete Topic Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteTopicConfirm}
        onClose={() => setShowDeleteTopicConfirm(false)}
        onConfirm={handleConfirmDeleteTopic}
        title="Delete Topic"
        message={deleteConfirmMessage}
        confirmText="Yes, Delete Topic"
        cancelText="Cancel"
        isDestructive={true}
        loading={deletingTopic}
      />
    </div>
    </div>
  );
};

export default ForumTopicView;