import { supabase } from './supabase';

export interface AiKnowledgeEntry {
  id: string;
  title: string;
  question: string;
  answer: string;
  category: string;
  keywords: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiKnowledgeGap {
  id: string;
  user_question: string;
  knowledge_found: boolean;
  created_at: string;
}

export interface KnowledgeTestResult {
  question: string;
  knowledge_entries: Array<{
    id: string;
    title: string;
    question: string;
    answer: string;
    category: string;
  }>;
  answer: string;
}

export type SuggestionType = 'new' | 'updated' | 'conflict' | 'needs_review';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface AiKnowledgeSuggestion {
  id: string;
  suggestion_type: SuggestionType;
  status: SuggestionStatus;
  title: string;
  question: string;
  answer: string;
  category: string;
  keywords: string | null;
  source_reference: string | null;
  discovered_at: string;
  existing_entry_id: string | null;
  existing_entry_title: string | null;
  existing_entry_answer: string | null;
  sync_run_id: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncRunSummary {
  id: string;
  status: string;
  pages_scanned: number;
  suggestions_generated: number;
  new_count: number;
  updated_count: number;
  conflict_count: number;
  needs_review_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface SyncResult {
  success: boolean;
  sync_run_id: string;
  pages_scanned: number;
  suggestions_generated: number;
  new_count: number;
  updated_count: number;
  conflict_count: number;
  needs_review_count: number;
}

class AiKnowledgeAPI {
  async getAll(): Promise<AiKnowledgeEntry[]> {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async search(query: string): Promise<AiKnowledgeEntry[]> {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .select('*')
      .or(`title.ilike.%${query}%,question.ilike.%${query}%,answer.ilike.%${query}%,keywords.ilike.%${query}%,category.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getByCategory(category: string): Promise<AiKnowledgeEntry[]> {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .select('category')
      .order('category');
    if (error) throw error;
    const categories = (data || []).map((r: { category: string }) => r.category);
    return [...new Set(categories)];
  }

  async getActiveCount(): Promise<number> {
    const { count, error } = await supabase
      .from('ai_knowledge')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (error) return 0;
    return count || 0;
  }

  async create(entry: Omit<AiKnowledgeEntry, 'id' | 'created_at' | 'updated_at'>): Promise<AiKnowledgeEntry> {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .insert({
        title: entry.title,
        question: entry.question,
        answer: entry.answer,
        category: entry.category,
        keywords: entry.keywords,
        is_active: entry.is_active,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, entry: Partial<Omit<AiKnowledgeEntry, 'id' | 'created_at' | 'updated_at'>>): Promise<AiKnowledgeEntry> {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .update({
        ...(entry.title !== undefined && { title: entry.title }),
        ...(entry.question !== undefined && { question: entry.question }),
        ...(entry.answer !== undefined && { answer: entry.answer }),
        ...(entry.category !== undefined && { category: entry.category }),
        ...(entry.keywords !== undefined && { keywords: entry.keywords }),
        ...(entry.is_active !== undefined && { is_active: entry.is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_knowledge')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { is_active: isActive });
  }

  async getGaps(limit = 50): Promise<AiKnowledgeGap[]> {
    const { data, error } = await supabase
      .from('ai_knowledge_gaps')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async getGapCount(): Promise<number> {
    const { count, error } = await supabase
      .from('ai_knowledge_gaps')
      .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  }

  async deleteGap(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_knowledge_gaps')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async testQuestion(question: string): Promise<KnowledgeTestResult> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-support`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: question,
        admin_test: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Test request failed');
    }

    return {
      question,
      knowledge_entries: data.knowledge_entries || [],
      answer: data.reply,
    };
  }

  // ── Knowledge Sync ──────────────────────────────────────────────────────

  async runSync(): Promise<SyncResult> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-knowledge-sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Knowledge sync failed');
    }

    return data as SyncResult;
  }

  async getPendingSuggestions(): Promise<AiKnowledgeSuggestion[]> {
    const { data, error } = await supabase
      .from('ai_knowledge_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getPendingSuggestionCount(): Promise<number> {
    const { count, error } = await supabase
      .from('ai_knowledge_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) return 0;
    return count || 0;
  }

  async approveSuggestion(suggestion: AiKnowledgeSuggestion): Promise<void> {
    if (suggestion.suggestion_type === 'updated' || suggestion.suggestion_type === 'conflict') {
      if (suggestion.existing_entry_id) {
        await this.update(suggestion.existing_entry_id, {
          title: suggestion.title,
          question: suggestion.question,
          answer: suggestion.answer,
          category: suggestion.category,
          keywords: suggestion.keywords,
        });
      } else {
        await this.create({
          title: suggestion.title,
          question: suggestion.question,
          answer: suggestion.answer,
          category: suggestion.category,
          keywords: suggestion.keywords,
          is_active: true,
        });
      }
    } else {
      await this.create({
        title: suggestion.title,
        question: suggestion.question,
        answer: suggestion.answer,
        category: suggestion.category,
        keywords: suggestion.keywords,
        is_active: true,
      });
    }

    await supabase
      .from('ai_knowledge_suggestions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      })
      .eq('id', suggestion.id);
  }

  async approveSuggestions(ids: string[]): Promise<void> {
    const { data: suggestions } = await supabase
      .from('ai_knowledge_suggestions')
      .select('*')
      .in('id', ids)
      .eq('status', 'pending');

    if (!suggestions) return;

    for (const s of suggestions) {
      await this.approveSuggestion(s as AiKnowledgeSuggestion);
    }
  }

  async rejectSuggestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_knowledge_suggestions')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async rejectSuggestions(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('ai_knowledge_suggestions')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', ids);
    if (error) throw error;
  }

  async deleteSuggestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_knowledge_suggestions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async updateSuggestion(id: string, updates: { title?: string; question?: string; answer?: string; category?: string; keywords?: string }): Promise<void> {
    const { error } = await supabase
      .from('ai_knowledge_suggestions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async getLastSyncRun(): Promise<SyncRunSummary | null> {
    const { data, error } = await supabase
      .from('ai_knowledge_sync_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data as SyncRunSummary | null;
  }
}

export const aiKnowledgeAPI = new AiKnowledgeAPI();
