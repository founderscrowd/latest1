import { supabase } from './supabase';

// --- Interfaces ---

export interface ForumAttachment {
  id: string;
  post_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface ForumTopic {
  id: string;
  group_id: string;
  title: string;
  created_by: string;
  created_at: string;
  last_post_at: string;
  is_locked: boolean;
  is_pinned: boolean;
  views_count: number;
  creator_profile?: {
    username: string;
    avatar_url?: string;
  };
  posts_count?: number;
}

export interface ForumPost {
  id: string;
  topic_id: string;
  posted_by: string;
  content: string;
  created_at: string;
  edited_at?: string;
  poster_profile?: {
    username: string;
    avatar_url?: string;
  };
  attachments?: ForumAttachment[];
}

export interface ForumTopicFilters {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'last_post_at' | 'views_count';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface ForumPostFilters {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'edited_at';
  sortOrder?: 'asc' | 'desc';
}

// --- ForumAPI Class ---

class ForumAPI {
  // --- Topic Management ---

  async createTopic(groupId: string, title: string, content: string, userId: string, attachments?: File[]): Promise<ForumTopic> {
    try {
      console.log('🔄 Creating topic with attachments:', { groupId, title, userId, attachmentCount: attachments?.length || 0 });
      
      // Create the topic
      const { data: topic, error: topicError } = await supabase
        .from('forum_topics')
        .insert({
          group_id: groupId,
          title,
          created_by: userId,
          last_post_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (topicError) throw topicError;
      console.log('✅ Topic created successfully:', topic.id);

      // Create the initial post using the existing createPost method to ensure attachments are handled
      try {
        console.log('🔄 Creating initial post for topic:', topic.id);
        await this.createPost(topic.id, content, userId, attachments);
        console.log('✅ Initial post created successfully with attachments');
      } catch (postError) {
        console.error('❌ Error creating initial post, cleaning up topic:', postError);
        // If post creation fails, attempt to delete the topic to prevent orphans
        await supabase.from('forum_topics').delete().eq('id', topic.id);
        throw postError;
      }

      // Re-fetch the topic to get updated data including posts_count
      const updatedTopic = await this.getTopic(topic.id);
      console.log('✅ Topic creation completed, returning updated topic data');
      
      return updatedTopic || topic;
    } catch (error) {
      console.error('Error creating forum topic:', error);
      throw error;
    }
  }

  async getTopics(groupId: string, filters?: ForumTopicFilters): Promise<ForumTopic[]> {
    try {
      let query = supabase
        .from('forum_topics')
        .select(`
          *,
          creator_profile:profiles!forum_topics_created_by_fkey(username, avatar_url)
        `)
        .eq('group_id', groupId);

      // Apply search filter
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'last_post_at';
      const sortOrder = filters?.sortOrder === 'asc' ? true : false;
      query = query.order(sortBy, { ascending: sortOrder });

      // Apply pagination
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      // Get posts count separately for each topic
      const topicsWithCounts = await Promise.all(
        (data || []).map(async (topic) => {
          const { count } = await supabase
            .from('forum_posts')
            .select('id', { count: 'exact', head: true })
            .eq('topic_id', topic.id);
          
          return {
            ...topic,
            posts_count: count || 0
          };
        })
      );

      return topicsWithCounts;
    } catch (error) {
      console.error('Error fetching forum topics:', error);
      throw error;
    }
  }

  async getTopic(topicId: string): Promise<ForumTopic | null> {
    try {
      const { data, error } = await supabase
        .from('forum_topics')
        .select(`
          *,
          creator_profile:profiles!forum_topics_created_by_fkey(username, avatar_url)
        `)
        .eq('id', topicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) return null;

      // Get posts count separately
      const { count } = await supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      return {
        ...data,
        posts_count: count || 0
      };
    } catch (error) {
      console.error('Error fetching single forum topic:', error);
      throw error;
    }
  }

  async updateTopic(topicId: string, updates: Partial<ForumTopic>, userId: string): Promise<ForumTopic> {
    try {
      const { data, error } = await supabase
        .from('forum_topics')
        .update(updates)
        .eq('id', topicId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating forum topic:', error);
      throw error;
    }
  }

  async deleteTopic(topicId: string, userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Starting topic deletion process:', { topicId, userId });
      
      // First, get topic details to check permissions and gather info for notifications
      const { data: topic, error: topicError } = await supabase
        .from('forum_topics')
        .select(`
          *,
          creator_profile:profiles!forum_topics_created_by_fkey(username, avatar_url)
        `)
        .eq('id', topicId)
        .single();

      if (topicError) {
        console.error('❌ Error fetching topic for deletion:', topicError);
        throw topicError;
      }

      if (!topic) {
        throw new Error('Topic not found');
      }

      // Check if user has permission to delete (creator or admin)
      const isCreator = topic.created_by === userId;
      
      // Check if user is group admin/starter
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', topic.group_id)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .maybeSingle();

      const isGroupAdmin = membership && ['admin', 'starter'].includes(membership.role);
      
      if (!isCreator && !isGroupAdmin) {
        throw new Error('Unauthorized: Only topic creators and group admins can delete topics');
      }

      console.log('✅ Permission check passed:', { isCreator, isGroupAdmin });

      // Get all participants who posted in this topic for notifications
      const { data: participants } = await supabase
        .from('forum_posts')
        .select('posted_by, profiles!forum_posts_posted_by_fkey(username)')
        .eq('topic_id', topicId)
        .neq('posted_by', userId); // Exclude the deleter

      console.log('📋 Found participants to notify:', participants?.length || 0);

      const { error } = await supabase
        .from('forum_topics')
        .delete()
        .eq('id', topicId);

      if (error) {
        console.error('❌ Error deleting topic:', error);
        throw error;
      }

      console.log('✅ Topic deleted successfully');

      // TODO: Implement notification system for participants
      // This would notify users that a topic they participated in was deleted
      if (participants && participants.length > 0) {
        console.log('📧 Would notify participants:', participants.map(p => p.profiles?.username).filter(Boolean));
      }

      return true;
    } catch (error) {
      console.error('Error deleting forum topic:', error);
      throw error;
    }
  }

  async getTopicStats(topicId: string): Promise<{
    postsCount: number;
    participantsCount: number;
    createdHoursAgo: number;
    hasOtherParticipants: boolean;
  }> {
    try {
      const { data: topic } = await supabase
        .from('forum_topics')
        .select('created_at, created_by')
        .eq('id', topicId)
        .single();

      if (!topic) throw new Error('Topic not found');

      // Get posts count
      const { count: postsCount } = await supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      // Get unique participants count
      const { data: participants } = await supabase
        .from('forum_posts')
        .select('posted_by')
        .eq('topic_id', topicId);

      const uniqueParticipants = new Set(participants?.map(p => p.posted_by) || []);
      const participantsCount = uniqueParticipants.size;
      const hasOtherParticipants = uniqueParticipants.size > 1 || 
        (uniqueParticipants.size === 1 && !uniqueParticipants.has(topic.created_by));

      // Calculate hours since creation
      const createdAt = new Date(topic.created_at);
      const now = new Date();
      const createdHoursAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      return {
        postsCount: postsCount || 0,
        participantsCount,
        createdHoursAgo,
        hasOtherParticipants
      };
    } catch (error) {
      console.error('Error getting topic stats:', error);
      throw error;
    }
  }
  async incrementTopicViews(topicId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_forum_topic_views', { topic_id_param: topicId });
      if (error) throw error;
    } catch (error) {
      console.warn('Could not increment topic views:', error);
    }
  }

  // --- Post Management ---

  async createPost(topicId: string, content: string, userId: string, attachments?: File[]): Promise<ForumPost> {
    try {
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          topic_id: topicId,
          posted_by: userId,
          content,
        })
        .select(`
          *,
          poster_profile:profiles!forum_posts_posted_by_fkey(username, avatar_url)
        `)
        .single();

      if (postError) throw postError;

      // Update last_post_at on the topic
      await supabase
        .from('forum_topics')
        .update({ last_post_at: new Date().toISOString() })
        .eq('id', topicId);

      // Handle attachments if any
      if (attachments && attachments.length > 0) {
        try {
          const uploadedAttachments = await this.uploadAttachments(post.id, attachments);
          post.attachments = uploadedAttachments;
        } catch (attachmentError) {
          console.error('Error uploading attachments:', attachmentError);
          // Don't fail the entire operation, just log the error
        }
      }

      return post;
    } catch (error) {
      console.error('Error creating forum post:', error);
      throw error;
    }
  }

  async getPosts(topicId: string, filters?: ForumPostFilters): Promise<ForumPost[]> {
    try {
      let query = supabase
        .from('forum_posts')
        .select(`
          *,
          poster_profile:profiles!forum_posts_posted_by_fkey(username, avatar_url),
          attachments:forum_attachments(*)
        `)
        .eq('topic_id', topicId);

      // Apply sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder === 'asc' ? true : false;
      query = query.order(sortBy, { ascending: sortOrder });

      // Apply pagination
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching forum posts:', error);
      throw error;
    }
  }

  async updatePost(postId: string, newContent: string, userId: string): Promise<ForumPost> {
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .update({ content: newContent, edited_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('posted_by', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating forum post:', error);
      throw error;
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)
        .eq('posted_by', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting forum post:', error);
      throw error;
    }
  }

  // --- File Upload Management ---

  async uploadAttachments(postId: string, files: File[]): Promise<ForumAttachment[]> {
    try {
      console.log('🔄 Starting uploadAttachments for postId:', postId, 'with', files.length, 'files');
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('❌ User not authenticated for file upload');
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.user.id);

      const attachments: ForumAttachment[] = [];

      for (const file of files) {
        console.log('📁 Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        // Validate file type
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          console.warn(`⚠️ Skipping unsupported file type: ${file.type} for file: ${file.name}`);
          continue;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          console.warn(`⚠️ Skipping file ${file.name}: too large (${file.size} bytes, max: ${maxSize})`);
          continue;
        }

        console.log('✅ File validation passed for:', file.name);

        const fileExt = file.name.split('.').pop();
        const fileName = `${postId}/${user.user.id}/${Date.now()}.${fileExt}`;
        console.log('📂 Generated file path:', fileName);

        // Upload file to storage
        console.log('⬆️ Uploading file to storage bucket: forum-attachments');
        const { error: uploadError } = await supabase.storage
          .from('forum-attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error(`❌ Error uploading file ${file.name}:`, uploadError);
          console.error('Upload error details:', uploadError.message, uploadError.statusCode);
          continue;
        }
        console.log('✅ File uploaded successfully to storage:', fileName);

        // Get public URL
        console.log('🔗 Getting public URL for file:', fileName);
        const { data: { publicUrl } } = supabase.storage
          .from('forum-attachments')
          .getPublicUrl(fileName);
        console.log('✅ Public URL generated:', publicUrl);

        // Save attachment record
        console.log('💾 Saving attachment record to database...');
        const { data: attachment, error: attachmentError } = await supabase
          .from('forum_attachments')
          .insert({
            post_id: postId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: publicUrl
          })
          .select()
          .single();

        if (attachmentError) {
          console.error(`❌ Error saving attachment record for ${file.name}:`, attachmentError);
          console.error('Database error details:', attachmentError.message, attachmentError.code, attachmentError.details);
          continue;
        }

        console.log('✅ Attachment record saved successfully:', attachment);
        attachments.push(attachment);
      }

      console.log('🎉 Upload process completed. Total attachments processed:', attachments.length);
      return attachments;
    } catch (error) {
      console.error('Error uploading forum attachments:', error);
      throw error;
    }
  }

  // --- Real-time Subscriptions ---

  subscribeToNewPosts(topicId: string, callback: (post: ForumPost) => void) {
    const subscription = supabase
      .channel(`forum_posts:${topicId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'forum_posts', filter: `topic_id=eq.${topicId}` },
        async (payload) => {
          // Fetch full post data including poster profile
          const { data } = await supabase
            .from('forum_posts')
            .select(`
              *,
              poster_profile:profiles!forum_posts_posted_by_fkey(username, avatar_url),
              attachments:forum_attachments(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }

  subscribeToPostChanges(
    topicId: string,
    onUpdate: (post: ForumPost) => void,
    onDelete: (postId: string) => void
  ) {
    const subscription = supabase
      .channel(`forum_posts_changes:${topicId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'forum_posts', filter: `topic_id=eq.${topicId}` },
        async (payload) => {
          const { data } = await supabase
            .from('forum_posts')
            .select(`
              *,
              poster_profile:profiles!forum_posts_posted_by_fkey(username, avatar_url),
              attachments:forum_attachments(*)
            `)
            .eq('id', payload.new.id)
            .single();
          if (data) onUpdate(data);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'forum_posts', filter: `topic_id=eq.${topicId}` },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }
}

export const forumAPI = new ForumAPI();