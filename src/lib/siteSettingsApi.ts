import { supabase } from './supabase';

export interface SiteSettings {
  id: string;
  key: string;
  value: string | null;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AnnouncementSettings {
  id: string;
  key: string;
  value: string | null;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

class SiteSettingsAPI {
  /**
   * Get a specific site setting by key
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching site setting:', error);
        return null;
      }

      return data?.value || null;
    } catch (error) {
      console.error('Error fetching site setting:', error);
      return null;
    }
  }

  /**
   * Get the current site logo URL
   */
  async getLogoUrl(): Promise<string | null> {
    return this.getSetting('logo_url');
  }

  /**
   * Get site announcement settings
   */
  async getAnnouncementSettings(): Promise<{ text: string | null; enabled: boolean }> {
    try {
      const [textSetting, enabledSetting] = await Promise.all([
        this.getSetting('site_announcement_text'),
        this.getSetting('site_announcement_enabled')
      ]);

      return {
        text: textSetting,
        enabled: enabledSetting === 'true'
      };
    } catch (error) {
      console.error('Error fetching announcement settings:', error);
      return { text: null, enabled: false };
    }
  }

  /**
   * Update site announcement settings
   */
  async updateAnnouncementSettings(text: string | null, enabled: boolean): Promise<void> {
    try {
      const isAdmin = await this.isCurrentUserSiteAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Only site administrators can update announcement settings');
      }

      await Promise.all([
        this.updateSetting('site_announcement_text', text),
        this.updateSetting('site_announcement_enabled', enabled ? 'true' : 'false')
      ]);
    } catch (error) {
      console.error('Error updating announcement settings:', error);
      throw error;
    }
  }

  /**
   * Get important message banner settings
   */
  async getImportantMessageSettings(): Promise<{ text: string | null; enabled: boolean }> {
    try {
      const [textSetting, enabledSetting] = await Promise.all([
        this.getSetting('important_message_text'),
        this.getSetting('important_message_enabled')
      ]);

      return {
        text: textSetting,
        enabled: enabledSetting === 'true'
      };
    } catch (error) {
      console.error('Error fetching important message settings:', error);
      return { text: null, enabled: false };
    }
  }

  /**
   * Update important message banner settings
   */
  async updateImportantMessageSettings(text: string | null, enabled: boolean): Promise<void> {
    try {
      const isAdmin = await this.isCurrentUserSiteAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Only site administrators can update important message settings');
      }

      await Promise.all([
        this.updateSetting('important_message_text', text),
        this.updateSetting('important_message_enabled', enabled ? 'true' : 'false')
      ]);
    } catch (error) {
      console.error('Error updating important message settings:', error);
      throw error;
    }
  }

  /**
   * Upload a new logo file and update the logo_url setting
   */
  async uploadLogo(file: File): Promise<string> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Check if user is site admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_site_admin')
        .eq('id', user.user.id)
        .single();

      if (!profile?.is_site_admin) {
        throw new Error('Unauthorized: Only site administrators can upload logos');
      }

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PNG, JPG, or SVG files only.');
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Get current logo URL to delete old file
      const currentLogoUrl = await this.getLogoUrl();
      
      // Delete old logo if exists
      if (currentLogoUrl) {
        try {
          const urlParts = currentLogoUrl.split('/');
          const oldFileName = urlParts[urlParts.length - 1];
          if (oldFileName && oldFileName.includes('logo-')) {
            const { error: deleteError } = await supabase.storage
              .from('site-logos')
              .remove([oldFileName]);
            
            if (deleteError) {
              console.warn('Could not delete old logo:', deleteError);
              // Don't throw error, continue with upload
            }
          }
        } catch (deleteError) {
          console.warn('Error deleting old logo:', deleteError);
          // Don't throw error, continue with upload
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('site-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-logos')
        .getPublicUrl(fileName);

      // Add a small delay to allow storage to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update site settings
      await this.updateSetting('logo_url', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  }

  /**
   * Remove the current logo
   */
  async removeLogo(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Check if user is site admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_site_admin')
        .eq('id', user.user.id)
        .single();

      if (!profile?.is_site_admin) {
        throw new Error('Unauthorized: Only site administrators can remove logos');
      }

      // Get current logo URL
      const currentLogoUrl = await this.getLogoUrl();
      
      // Delete logo file if exists
      if (currentLogoUrl) {
        const fileName = currentLogoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('site-logos')
            .remove([fileName]);
        }
      }

      // Update site settings to remove logo URL
      await this.updateSetting('logo_url', null);
    } catch (error) {
      console.error('Error removing logo:', error);
      throw error;
    }
  }

  /**
   * Update a site setting
   */
  private async updateSetting(key: string, value: string | null): Promise<void> {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating site setting:', error);
      throw error;
    }
  }

  /**
   * Check if AI support chatbot is enabled
   */
  async getAiSupportEnabled(): Promise<boolean> {
    const value = await this.getSetting('ai_support_enabled');
    return value !== 'false';
  }

  /**
   * Toggle AI support chatbot on/off (admin only)
   */
  async toggleAiSupport(enabled: boolean): Promise<void> {
    try {
      const isAdmin = await this.isCurrentUserSiteAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Only site administrators can toggle AI support');
      }
      const { error } = await supabase.rpc('toggle_ai_support', { enabled });
      if (error) throw error;
    } catch (error) {
      console.error('Error toggling AI support:', error);
      throw error;
    }
  }

  /**
   * Check if current user is site admin
   */
  async isCurrentUserSiteAdmin(): Promise<boolean> {
    try {
      console.log('>>> isCurrentUserSiteAdmin CALLED');

      // Get current session to check JWT
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('>>> Session exists:', !!sessionData.session);
      console.log('>>> Access token exists:', !!sessionData.session?.access_token);

      const { data: user, error: userError } = await supabase.auth.getUser();
      console.log('>>> Got user:', user?.user?.id);
      console.log('>>> User email:', user?.user?.email);
      console.log('>>> User error:', userError);

      if (userError) {
        console.error('>>> Error getting user:', userError);
        return false;
      }

      if (!user.user) {
        console.log('>>> No user, returning false');
        return false;
      }

      console.log('>>> Querying profiles table for user:', user.user.id);
      console.log('>>> Query: .from("profiles").select("is_site_admin").eq("id", user.id).maybeSingle()');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_site_admin')
        .eq('id', user.user.id)
        .maybeSingle();

      console.log('>>> Profile query completed');
      console.log('>>> Profile data:', JSON.stringify(profile));
      console.log('>>> Profile error:', JSON.stringify(error));

      if (error) {
        console.error('>>> Error querying profile - code:', error.code);
        console.error('>>> Error querying profile - message:', error.message);
        console.error('>>> Error querying profile - details:', error.details);
        console.error('>>> Error querying profile - hint:', error.hint);
        return false;
      }

      if (!profile) {
        console.warn('>>> No profile found for user:', user.user.id);
        console.warn('>>> This might be an RLS policy issue');
        return false;
      }

      console.log('>>> is_site_admin field value:', profile?.is_site_admin);
      console.log('>>> is_site_admin type:', typeof profile?.is_site_admin);

      const isAdmin = profile.is_site_admin === true;
      console.log('>>> FINAL RESULT:', isAdmin);
      return isAdmin;
    } catch (error) {
      console.error('>>> ERROR in isCurrentUserSiteAdmin:', error);
      return false;
    }
  }
}

export const siteSettingsAPI = new SiteSettingsAPI();