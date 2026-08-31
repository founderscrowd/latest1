import { supabase } from './supabase';

export interface Conversation {
  id: string;
  type: 'group' | 'private';
  group_id?: string;
  name?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_archived: boolean;
  metadata: Record<string, any>;
  participants?: ConversationParticipant[];
  unread_count?: number;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  metadata: Record<string, any>;
  sender_profile?: {
    username: string;
    avatar_url?: string;
  };
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  read_by?: MessageReadStatus[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'moderator' | 'starter';
  joined_at: string;
  left_at?: string;
  last_read_at: string;
  is_muted: boolean;
  notification_settings: Record<string, any>;
  profile?: {
    username: string;
    avatar_url?: string;
  };
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  updated_at: string;
}

class ChatAPI {
  // Conversations
  async getConversations(limit = 20, offset = 0): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            profile:profiles(username, avatar_url)
          )
        `)
        .order('last_message_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Get unread counts and last messages for each conversation
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conversation) => {
          const [unreadCount, lastMessage] = await Promise.all([
            this.getUnreadCount(conversation.id),
            this.getLastMessage(conversation.id)
          ]);

          return {
            ...conversation,
            unread_count: unreadCount,
            last_message: lastMessage
          };
        })
      );

      return conversationsWithDetails;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            profile:profiles(username, avatar_url)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  async createPrivateConversation(targetUserId: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_private_conversation', {
        target_user_id: targetUserId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating private conversation:', error);
      throw error;
    }
  }

  async createGroupConversation(groupId: string, name?: string): Promise<string> {
    try {
      console.log('Creating group conversation for group:', groupId, 'with name:', name);
      
      const { data, error } = await supabase.rpc('create_group_conversation', {
        group_id_param: groupId,
        conversation_name: name
      });

      console.log('RPC response - data:', data, 'error:', error);
      
      if (error) throw error;
      
      console.log('Successfully created group conversation with ID:', data);
      
      // Ensure the creator is properly added as an active participant
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase
            .from('conversation_participants')
            .upsert({
              conversation_id: data,
              user_id: user.user.id,
              role: 'starter',
              joined_at: new Date().toISOString(),
              last_read_at: new Date().toISOString(),
              left_at: null, // Explicitly set to null for active participation
              is_muted: false,
              notification_settings: { mentions: true, all_messages: true }
            }, {
              onConflict: 'conversation_id,user_id'
            });
        }
      } catch (participantError) {
        console.warn('Could not ensure creator participation:', participantError);
        // Don't throw error as conversation was created successfully
      }
      
      return data;
    } catch (error) {
      console.error('Error creating group conversation:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      throw error;
    }
  }

  async getGroupConversation(groupId: string): Promise<Conversation | null> {
    try {
      console.log('Fetching group conversation for group:', groupId);
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            profile:profiles(username, avatar_url)
          )
        `)
        .eq('group_id', groupId)
        .eq('type', 'group')
        .maybeSingle();

      console.log('Group conversation query result - data:', data, 'error:', error);
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching group conversation:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      return null;
    }
  }

  // Messages
  async getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, avatar_url),
          reactions:message_reactions(*),
          attachments:message_attachments(*),
          read_by:message_read_status(*)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'system' = 'text',
    replyToId?: string,
    attachments?: File[]
  ): Promise<Message> {
    try {
      console.log('Sending message:', { conversationId, content, messageType });
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Validate conversation exists and user has access
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single();
      
      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Insert message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.user.id,
          content,
          message_type: messageType,
          reply_to_id: replyToId
        })
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, avatar_url)
        `)
        .single();

      if (messageError) {
        console.error('Message insert error:', messageError);
        throw messageError;
      }
      
      console.log('Message sent successfully:', message);

      // Handle attachments if any
      if (attachments && attachments.length > 0) {
        await this.uploadAttachments(message.id, conversationId, attachments);
      }

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async editMessage(messageId: string, content: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          deleted_at: new Date().toISOString(),
          content: '[Message deleted]'
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.user.id,
          emoji
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.user.id)
        .eq('emoji', emoji);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  async markMessagesAsRead(conversationId: string, upToMessageId?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_messages_as_read', {
        conversation_id_param: conversationId,
        up_to_message_id: upToMessageId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async getUnreadCount(conversationId: string): Promise<number> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 0;

      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.user.id)
        .single();

      if (!participant) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.user.id)
        .gt('created_at', participant.last_read_at)
        .is('deleted_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async getLastMessage(conversationId: string): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting last message:', error);
      return null;
    }
  }

  // File uploads
  async uploadAttachments(messageId: string, conversationId: string, files: File[]): Promise<MessageAttachment[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const attachments: MessageAttachment[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${conversationId}/${user.user.id}/${Date.now()}.${fileExt}`;

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        // Save attachment record
        const { data: attachment, error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: publicUrl
          })
          .select()
          .single();

        if (attachmentError) throw attachmentError;
        attachments.push(attachment);
      }

      return attachments;
    } catch (error) {
      console.error('Error uploading attachments:', error);
      throw error;
    }
  }

  // User presence
  async updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.user.id,
          status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        // Handle various error cases gracefully
        if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('Chat system tables not found. Please run the migration: supabase/migrations/create_chat_system.sql');
          return;
        }
        // Handle network/connectivity errors
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          console.warn('Network error updating presence. This is normal if offline or if Supabase is unreachable.');
          return;
        }
        throw error;
      }
    } catch (error) {
      // Catch any other errors and handle them gracefully
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('Network connectivity issue. Unable to update presence status.');
        return;
      }
      console.warn('Error updating presence:', error);
      // Don't throw the error to prevent it from breaking the app
    }
  }

  async getUserPresence(userIds: string[]): Promise<UserPresence[]> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user presence:', error);
      return [];
    }
  }

  // Real-time subscriptions
  subscribeToConversation(conversationId: string, callbacks: {
    onMessage?: (message: Message) => void;
    onMessageUpdate?: (message: Message) => void;
    onMessageDelete?: (messageId: string) => void;
    onReaction?: (reaction: MessageReaction) => void;
    onTyping?: (userId: string, isTyping: boolean) => void;
  }) {
    const messagesSubscription = supabase
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          if (callbacks.onMessage) {
            // Fetch full message with relations
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                sender_profile:profiles!messages_sender_id_fkey(username, avatar_url),
                reactions:message_reactions(*),
                attachments:message_attachments(*)
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (data) callbacks.onMessage(data);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          if (callbacks.onMessageUpdate) {
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                sender_profile:profiles!messages_sender_id_fkey(username, avatar_url),
                reactions:message_reactions(*),
                attachments:message_attachments(*)
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (data) callbacks.onMessageUpdate(data);
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (callbacks.onMessageDelete) {
            callbacks.onMessageDelete(payload.old.id);
          }
        }
      )
      .subscribe();

    const reactionsSubscription = supabase
      .channel(`reactions-${conversationId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          if (callbacks.onReaction) {
            // Check if this reaction belongs to a message in our conversation
            const { data: message } = await supabase
              .from('messages')
              .select('conversation_id')
              .eq('id', payload.new?.message_id || payload.old?.message_id)
              .single();
            
            if (message?.conversation_id === conversationId) {
              callbacks.onReaction(payload.new || payload.old);
            }
          }
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      reactionsSubscription.unsubscribe();
    };
  }

  subscribeToConversations(callbacks: {
    onConversationUpdate?: (conversation: Conversation) => void;
    onNewConversation?: (conversation: Conversation) => void;
  }) {
    const subscription = supabase
      .channel('user-conversations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async (payload) => {
          // Fetch full conversation with participants
          const { data } = await supabase
            .from('conversations')
            .select(`
              *,
              participants:conversation_participants(
                *,
                profile:profiles(username, avatar_url)
              )
            `)
            .eq('id', payload.new?.id || payload.old?.id)
            .single();

          if (data) {
            if (payload.eventType === 'INSERT' && callbacks.onNewConversation) {
              callbacks.onNewConversation(data);
            } else if (payload.eventType === 'UPDATE' && callbacks.onConversationUpdate) {
              callbacks.onConversationUpdate(data);
            }
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }

  // Search messages
  async searchMessages(query: string, conversationId?: string, limit = 20): Promise<Message[]> {
    try {
      let supabaseQuery = supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, avatar_url),
          conversation:conversations(name, type)
        `)
        .textSearch('content', query)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (conversationId) {
        supabaseQuery = supabaseQuery.eq('conversation_id', conversationId);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }
}

export const chatAPI = new ChatAPI();