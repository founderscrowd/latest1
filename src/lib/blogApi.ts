import { supabase } from './supabase';

export interface SiteContent {
  id: string;
  content_type: 'blog_post' | 'about_section';
  title: string;
  slug: string;
  content_body: string;
  excerpt: string;
  featured_image_url: string | null;
  additional_images: string[];
  is_published: boolean;
  display_order: number;
  meta_description: string;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentData {
  content_type: 'blog_post' | 'about_section';
  title: string;
  content_body: string;
  excerpt?: string;
  featured_image_url?: string;
  additional_images?: string[];
  is_published?: boolean;
  display_order?: number;
  meta_description?: string;
  slug?: string;
  published_at?: string;
}

export interface UpdateContentData {
  title?: string;
  content_body?: string;
  excerpt?: string;
  featured_image_url?: string;
  additional_images?: string[];
  is_published?: boolean;
  display_order?: number;
  meta_description?: string;
  slug?: string;
  published_at?: string;
}

const generateSlug = (title: string): string => {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const blogAPI = {
  async getPublishedBlogPosts(): Promise<SiteContent[]> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('content_type', 'blog_post')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching published blog posts:', error);
      throw error;
    }

    return data || [];
  },

  async getAllBlogPosts(): Promise<SiteContent[]> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('content_type', 'blog_post')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all blog posts:', error);
      throw error;
    }

    return data || [];
  },

  async getBlogPostBySlug(slug: string): Promise<SiteContent | null> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('content_type', 'blog_post')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error fetching blog post by slug:', error);
      throw error;
    }

    return data;
  },

  async getPublishedAboutSections(): Promise<SiteContent[]> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('content_type', 'about_section')
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching published about sections:', error);
      throw error;
    }

    return data || [];
  },

  async getAllAboutSections(): Promise<SiteContent[]> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('content_type', 'about_section')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching all about sections:', error);
      throw error;
    }

    return data || [];
  },

  async createContent(contentData: CreateContentData): Promise<SiteContent> {
    const { data: userData } = await supabase.auth.getUser();

    const slug = (contentData.slug && contentData.slug.trim())
      ? contentData.slug.trim().toLowerCase().replace(/^-+|-+$/g, '')
      : generateSlug(contentData.title);

    const { data, error } = await supabase
      .from('site_content')
      .insert([
        {
          ...contentData,
          slug,
          author_id: userData?.user?.id || null,
          published_at: contentData.is_published ? (contentData.published_at || new Date().toISOString()) : null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating content:', error);
      throw error;
    }

    return data;
  },

  async updateContent(id: string, contentData: UpdateContentData): Promise<SiteContent> {
    const updateData: any = { ...contentData };

    if (contentData.slug !== undefined) {
      updateData.slug = (contentData.slug && contentData.slug.trim())
        ? contentData.slug.trim().toLowerCase().replace(/^-+|-+$/g, '')
        : generateSlug(contentData.title || '');
    } else if (contentData.title) {
      updateData.slug = generateSlug(contentData.title);
    }

    if (contentData.is_published !== undefined) {
      if (contentData.is_published && !contentData.published_at) {
        updateData.published_at = new Date().toISOString();
      } else if (!contentData.is_published) {
        updateData.published_at = null;
      }
    }

    const { data, error } = await supabase
      .from('site_content')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content:', error);
      throw error;
    }

    return data;
  },

  async deleteContent(id: string): Promise<void> {
    const { error } = await supabase
      .from('site_content')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  },

  async uploadImage(file: File, folder: string = 'general'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('blog-content')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('blog-content')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  async deleteImage(imageUrl: string): Promise<void> {
    const urlParts = imageUrl.split('/blog-content/');
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL');
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('blog-content')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  },

  async reorderContent(contentType: 'blog_post' | 'about_section', contentIds: string[]): Promise<void> {
    const updates = contentIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from('site_content')
        .update({ display_order: update.display_order })
        .eq('id', update.id);
    }
  },
};
