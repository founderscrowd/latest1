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
}

export const aiKnowledgeAPI = new AiKnowledgeAPI();
