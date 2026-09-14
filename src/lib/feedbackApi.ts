import { supabase } from './supabase';

export type FeedbackType = 'suggestion' | 'problem' | 'experience' | 'feature' | 'confusing' | 'other';
export type FeedbackStatus = 'new' | 'reviewing' | 'implemented' | 'dismissed';

export interface Feedback {
  id: string;
  user_id: string | null;
  email: string | null;
  feedback_type: FeedbackType;
  message: string;
  page_url: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface FeedbackStats {
  total: number;
  new: number;
  reviewing: number;
  implemented: number;
  dismissed: number;
}

export const feedbackApi = {
  async submitFeedback(data: {
    feedback_type: FeedbackType;
    message: string;
    email?: string;
    page_url?: string;
  }): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const insertData: Record<string, unknown> = {
      feedback_type: data.feedback_type,
      message: data.message,
      page_url: data.page_url || window.location.href,
    };

    if (user) {
      insertData.user_id = user.id;
      insertData.email = user.email;
    } else if (data.email && data.email.trim()) {
      insertData.email = data.email.trim();
    }

    const { error } = await supabase
      .from('feedback')
      .insert(insertData);

    if (error) {
      throw error;
    }
  },

  async getAllFeedback(options?: {
    status?: FeedbackStatus;
    type?: FeedbackType;
    search?: string;
    sort?: 'newest' | 'oldest';
  }): Promise<Feedback[]> {
    let query = supabase.from('feedback').select('*');

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.type) {
      query = query.eq('feedback_type', options.type);
    }
    if (options?.search) {
      query = query.or(`message.ilike.%${options.search}%,email.ilike.%${options.search}%,admin_notes.ilike.%${options.search}%`);
    }

    query = query.order('created_at', { ascending: options?.sort === 'oldest' });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []) as Feedback[];
  },

  async getFeedbackStats(): Promise<FeedbackStats> {
    const { data, error } = await supabase.from('feedback').select('status');

    if (error) {
      throw error;
    }

    const rows = data || [];
    return {
      total: rows.length,
      new: rows.filter((r: any) => r.status === 'new').length,
      reviewing: rows.filter((r: any) => r.status === 'reviewing').length,
      implemented: rows.filter((r: any) => r.status === 'implemented').length,
      dismissed: rows.filter((r: any) => r.status === 'dismissed').length,
    };
  },

  async updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
    const { error } = await supabase
      .from('feedback')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async updateAdminNotes(id: string, adminNotes: string): Promise<void> {
    const { error } = await supabase
      .from('feedback')
      .update({ admin_notes: adminNotes })
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async deleteFeedback(id: string): Promise<void> {
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },
};
