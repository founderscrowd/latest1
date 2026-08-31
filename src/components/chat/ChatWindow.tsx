import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Reply, Edit2, Trash2, Image, File, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { chatAPI, Message, Conversation, MessageReaction } from '../../lib/chatApi';

interface ChatWindowProps {
  conversationId: string;
  conversation?: Conversation;
  onClose?: () => void;
  className?: string;
  onToggleFullScreen?: () => void;
  isFullScreen?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  conversationId, 
  conversation, 
  onClose,
  className = '',
  onToggleFullScreen,
  isFullScreen = false
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetchMessages();
    const unsubscribe = subscribeToMessages();
    
    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Mark messages as read when conversation is viewed
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only mark as read if the last message has a real ID (not a temporary one)
      if (lastMessage.id && !lastMessage.id.startsWith('temp-')) {
        chatAPI.markMessagesAsRead(conversationId, lastMessage.id);
      }
    }
  }, [messages, conversationId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const fetchedMessages = await chatAPI.getMessages(conversationId);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    return chatAPI.subscribeToConversation(conversationId, {
      onMessage: (message) => {
        setMessages(prev => [...prev, message]);
      },
      onMessageUpdate: (message) => {
        setMessages(prev => prev.map(m => m.id === message.id ? message : m));
      },
      onMessageDelete: (messageId) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      },
      onReaction: (reaction) => {
        setMessages(prev => prev.map(message => {
          if (message.id === reaction.message_id) {
            const existingReactions = message.reactions || [];
            const updatedReactions = existingReactions.filter(r => 
              !(r.user_id === reaction.user_id && r.emoji === reaction.emoji)
            );
            updatedReactions.push(reaction);
            return { ...message, reactions: updatedReactions };
          }
          return message;
        }));
      },
      onTyping: (userId, isTyping) => {
        setTypingUsers(prev => {
          if (isTyping) {
            return prev.includes(userId) ? prev : [...prev, userId];
          } else {
            return prev.filter(id => id !== userId);
          }
        });
      }
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return;

    // Declare variables outside try-catch block so they're accessible in catch
    let optimisticMessage: Message;
    let messageContent: string;
    let replyToId: string | undefined;
    let files: File[];

    try {
      setSending(true);
      
      // Create optimistic message for immediate display
      optimisticMessage = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversation_id: conversationId,
        sender_id: user?.id || '',
        content: newMessage || '[File attachment]',
        message_type: selectedFiles.length > 0 ? 'file' : 'text',
        reply_to_id: replyTo?.id,
        created_at: new Date().toISOString(),
        metadata: {},
        sender_profile: {
          username: user?.email?.split('@')[0] || 'You',
          avatar_url: undefined
        },
        reactions: [],
        attachments: [],
        read_by: []
      };

      // Add optimistic message immediately to UI
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Clear input immediately for better UX
      messageContent = newMessage;
      replyToId = replyTo?.id;
      files = [...selectedFiles];
      
      setNewMessage('');
      setReplyTo(null);
      setSelectedFiles([]);
      
      if (editingMessage) {
        await chatAPI.editMessage(editingMessage.id, newMessage);
        setEditingMessage(null);
      } else {
        const sentMessage = await chatAPI.sendMessage(
          conversationId,
          messageContent || '[File attachment]',
          selectedFiles.length > 0 ? 'file' : 'text',
          replyToId,
          files
        );
        
        // Replace optimistic message with real message
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? sentMessage : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error and restore input
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessage(messageContent);
      setReplyTo(replyTo);
      setSelectedFiles(files);
      
      // Show error message to user
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      const existingReaction = message?.reactions?.find(r => 
        r.user_id === user?.id && r.emoji === emoji
      );

      if (existingReaction) {
        await chatAPI.removeReaction(messageId, emoji);
      } else {
        await chatAPI.addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉'];

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Chat Header */}
      {conversation && (
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900">
              {conversation.name || 'Private Chat'}
            </h3>
            <p className="text-sm text-slate-600">
              {conversation.participants?.length} participants
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onToggleFullScreen && (
              <button
                onClick={onToggleFullScreen}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                title={isFullScreen ? "Exit full screen" : "Expand to full screen"}
              >
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md ${message.sender_id === user?.id ? 'order-2' : 'order-1'}`}>
              {/* Reply indicator */}
              {message.reply_to_id && (
                <div className="text-xs text-slate-500 mb-1 pl-3 border-l-2 border-slate-300">
                  Replying to message
                </div>
              )}
              
              <div
                className={`relative group px-4 py-2 rounded-lg ${
                  message.sender_id === user?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                {/* Message content */}
                <div className="break-words">
                  {message.deleted_at ? (
                    <em className="text-slate-500">Message deleted</em>
                  ) : (
                    message.content
                  )}
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 p-2 bg-white/10 rounded">
                        {attachment.file_type.startsWith('image/') ? (
                          <Image size={16} />
                        ) : (
                          <File size={16} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                          <p className="text-xs opacity-75">{formatFileSize(attachment.file_size)}</p>
                        </div>
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message actions */}
                {!message.deleted_at && (
                  <div className="absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1">
                      <button
                        onClick={() => setReplyTo(message)}
                        className="p-1 hover:bg-slate-100 rounded"
                        title="Reply"
                      >
                        <Reply size={14} />
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                        className="p-1 hover:bg-slate-100 rounded"
                        title="React"
                      >
                        <Smile size={14} />
                      </button>
                      {message.sender_id === user?.id && (
                        <>
                          <button
                            onClick={() => {
                              setEditingMessage(message);
                              setNewMessage(message.content);
                            }}
                            className="p-1 hover:bg-slate-100 rounded"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => chatAPI.deleteMessage(message.id)}
                            className="p-1 hover:bg-slate-100 rounded text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Emoji picker */}
                {showEmojiPicker === message.id && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10">
                    <div className="flex gap-1">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            handleReaction(message.id, emoji);
                            setShowEmojiPicker(null);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message timestamp and edit indicator */}
                <div className={`text-xs mt-1 ${
                  message.sender_id === user?.id ? 'text-blue-100' : 'text-slate-500'
                }`}>
                  {formatTime(message.created_at)}
                  {message.edited_at && ' (edited)'}
                </div>
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(
                    message.reactions.reduce((acc, reaction) => {
                      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(message.id, emoji)}
                      className={`px-2 py-1 rounded-full text-xs border ${
                        message.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      {emoji} {count}
                    </button>
                  ))}
                </div>
              )}

              {/* Sender info for group chats */}
              {conversation?.type === 'group' && message.sender_id !== user?.id && (
                <div className="text-xs text-slate-500 mt-1">
                  {message.sender_profile?.username || 'Unknown User'}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-slate-500 ml-2">
                  {typingUsers.length === 1 ? 'Someone is typing...' : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply size={16} className="text-slate-400" />
              <span className="text-sm text-slate-600">
                Replying to {replyTo.sender_profile?.username || 'Unknown User'}
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-slate-500 truncate mt-1 pl-6">
            {replyTo.content}
          </div>
        </div>
      )}

      {/* File preview */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                {file.type.startsWith('image/') ? (
                  <Image size={16} className="text-blue-600" />
                ) : (
                  <File size={16} className="text-slate-600" />
                )}
                <span className="text-sm truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200">
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={editingMessage ? "Edit message..." : "Type your message..."}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            type="submit"
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        
        {editingMessage && (
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
            <span>Editing message</span>
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null);
                setNewMessage('');
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatWindow;