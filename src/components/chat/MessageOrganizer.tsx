import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Archive, 
  Star, 
  MessageSquare, 
  Users, 
  Calendar,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { chatAPI, Conversation, Message } from '../../lib/chatApi';
import ChatWindow from './ChatWindow';

interface MessageOrganizerProps {
  onClose: () => void;
  initialConversationId?: string;
}

const MessageOrganizer: React.FC<MessageOrganizerProps> = ({ onClose, initialConversationId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(initialConversationId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'archived' | 'starred'>('all');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    fetchConversations();
    const unsubscribe = subscribeToConversations();
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const fetchedConversations = await chatAPI.getConversations();
      setConversations(fetchedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConversations = () => {
    return chatAPI.subscribeToConversations({
      onConversationUpdate: (conversation) => {
        setConversations(prev => prev.map(c => c.id === conversation.id ? conversation : c));
      },
      onNewConversation: (conversation) => {
        setConversations(prev => [conversation, ...prev]);
      }
    });
  };

  const performSearch = async () => {
    try {
      setSearchLoading(true);
      const results = await chatAPI.searchMessages(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    switch (filterType) {
      case 'unread':
        return (conversation.unread_count || 0) > 0;
      case 'archived':
        return conversation.is_archived;
      case 'starred':
        return conversation.metadata?.starred;
      default:
        return !conversation.is_archived;
    }
  });

  const formatLastMessageTime = (dateString: string) => {
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
      return date.toLocaleDateString();
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleBulkAction = async (action: 'archive' | 'delete' | 'star') => {
    try {
      // Implement bulk actions here
      console.log(`Performing ${action} on messages:`, selectedMessages);
      setSelectedMessages([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  if (selectedConversation) {
    const conversation = conversations.find(c => c.id === selectedConversation);
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setSelectedConversation(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to Messages
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <ChatWindow
          conversationId={selectedConversation}
          conversation={conversation}
          className="flex-1"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-900">Message Organizer</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {showFilters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', icon: MessageSquare },
              { key: 'unread', label: 'Unread', icon: MessageSquare },
              { key: 'archived', label: 'Archived', icon: Archive },
              { key: 'starred', label: 'Starred', icon: Star }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilterType(key as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterType === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Bulk Actions */}
        {selectedMessages.length > 0 && (
          <div className="flex items-center justify-between mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('star')}
                className="p-1 text-blue-600 hover:text-blue-700"
                title="Star selected"
              >
                <Star size={16} />
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="p-1 text-blue-600 hover:text-blue-700"
                title="Archive selected"
              >
                <Archive size={16} />
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="p-1 text-red-600 hover:text-red-700"
                title="Delete selected"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setSelectedMessages([])}
                className="p-1 text-slate-600 hover:text-slate-700"
                title="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {searchQuery.trim() ? (
          /* Search Results */
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No messages found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setSelectedConversation(message.conversation_id);
                        setSearchQuery('');
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900">
                              {message.sender_profile?.username || 'Unknown User'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatLastMessageTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 line-clamp-2">
                            {message.content}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(message.id)}
                          onChange={() => toggleMessageSelection(message.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-3"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Conversations List */
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No conversations found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {conversation.type === 'group' ? (
                            <Users size={16} />
                          ) : (
                            conversation.participants?.[0]?.profile?.username?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {conversation.name || 
                                (conversation.type === 'private' 
                                  ? conversation.participants?.find(p => p.user_id !== user?.id)?.profile?.username || 'Private Chat'
                                  : 'Group Chat'
                                )
                              }
                            </h3>
                            {conversation.type === 'group' && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Group
                              </span>
                            )}
                            {conversation.metadata?.starred && (
                              <Star size={14} className="text-yellow-500 fill-current" />
                            )}
                          </div>
                          
                          <p className="text-sm text-slate-600 truncate">
                            {conversation.last_message?.content || 'No messages yet'}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">
                              {conversation.last_message_at && formatLastMessageTime(conversation.last_message_at)}
                            </span>
                            {conversation.participants && (
                              <span className="text-xs text-slate-500">
                                • {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-3">
                        {(conversation.unread_count || 0) > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                            {conversation.unread_count}
                          </span>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show conversation options menu
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageOrganizer;