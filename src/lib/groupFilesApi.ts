import { supabase } from './supabase';

export interface GroupFile {
  id: string;
  group_id: string;
  uploader_user_id: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  description: string | null;
  is_pinned: boolean;
  display_order: number;
  pinned_at: string | null;
  uploader_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface CreateFileRecordResult {
  file_id: string;
  storage_path: string;
}

export interface SignedDownloadUrl {
  url: string;
  filename: string;
  expires_in: number;
}

class GroupFilesAPI {
  /**
   * List all files in a group.
   * Returns pinned files first (ordered by display_order), then unpinned by upload date.
   * Only accessible to Starter, Admin, and Cofounder roles (enforced by RLS).
   */
  async listFiles(groupId: string): Promise<GroupFile[]> {
    try {
      const { data, error } = await supabase
        .from('group_files')
        .select(`
          *,
          uploader_profile:public_profile_display!group_files_uploader_user_id_fkey(username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true })
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listing group files:', error);
      throw error;
    }
  }

  /**
   * Upload a file to a group's private file library.
   * This is a two-step process:
   * 1. Call the create_group_file_record RPC to validate permissions, file type/size,
   *    and quota limits, and create the database record with an unpredictable storage path.
   * 2. Upload the file bytes to the storage bucket at the generated path.
   * If step 2 fails, the database record is cleaned up to prevent orphaned metadata.
   */
  async uploadFile(
    groupId: string,
    file: File,
    description?: string
  ): Promise<GroupFile> {
    try {
      // Determine MIME type — use the file's type, with a fallback for common cases
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const fallbackMimes: Record<string, string> = {
          pdf: 'application/pdf',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xls: 'application/vnd.ms-excel',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ppt: 'application/vnd.ms-powerpoint',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
          txt: 'text/plain',
        };
        mimeType = fallbackMimes[ext] || '';
      }

      // Step 1: Create the database record (validates permissions, type, size, quota)
      const { data: record, error: recordError } = await supabase
        .rpc('create_group_file_record', {
          p_group_id: groupId,
          p_original_filename: file.name,
          p_mime_type: mimeType,
          p_file_size: file.size,
          p_description: description || null,
        });

      if (recordError) {
        throw new Error(this.mapRpcError(recordError.message));
      }

      if (!record || !record.storage_path) {
        throw new Error('Failed to create file record.');
      }

      const { file_id, storage_path } = record as CreateFileRecordResult;

      // Step 2: Upload the file bytes to storage
      const { error: uploadError } = await supabase
        .storage
        .from('group-files')
        .upload(storage_path, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        // Upload failed — clean up the orphaned database record
        await this.cleanupOrphanedRecord(file_id);
        throw new Error('File upload failed. Please try again.');
      }

      // Fetch and return the complete file record
      const { data: fileRecord, error: fetchError } = await supabase
        .from('group_files')
        .select(`
          *,
          uploader_profile:public_profile_display!group_files_uploader_user_id_fkey(username, avatar_url)
        `)
        .eq('id', file_id)
        .maybeSingle();

      if (fetchError || !fileRecord) {
        throw new Error('File uploaded but record could not be retrieved.');
      }

      return fileRecord;
    } catch (error) {
      console.error('Error uploading group file:', error);
      throw error;
    }
  }

  /**
   * Get a short-lived signed download URL for a file.
   * Calls the group-files-download edge function which verifies the caller's role
   * before generating a 60-second signed URL via the Storage API.
   */
  async getDownloadUrl(fileId: string): Promise<SignedDownloadUrl> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Authentication required.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/group-files-download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ file_id: fileId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(this.mapDownloadError(response.status, errorData?.error));
      }

      const data = await response.json();
      return {
        url: data.url,
        filename: data.filename,
        expires_in: data.expires_in,
      };
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Delete a file.
   * Calls the group-files-delete edge function which:
   * - Verifies the caller's role (Starter/Admin can delete any, Cofounder only own)
   * - Removes the storage object via the Storage API
   * - Removes the database record
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Authentication required.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/group-files-delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ file_id: fileId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(this.mapDeleteError(response.status, errorData?.error));
      }
    } catch (error) {
      console.error('Error deleting group file:', error);
      throw error;
    }
  }

  /**
   * Update the description of a file.
   * Only the description column is client-writable (enforced by column-level grants).
   * Pinning is deferred to Stage 3.
   */
  async updateDescription(fileId: string, description: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('group_files')
        .update({ description: description || null })
        .eq('id', fileId);

      if (error) {
        throw new Error(this.mapRpcError(error.message));
      }
    } catch (error) {
      console.error('Error updating file description:', error);
      throw error;
    }
  }

  /**
   * Get the total storage used by a group (sum of file sizes).
   * Useful for showing a storage usage indicator in the UI (Stage 2/3).
   */
  async getGroupStorageUsage(groupId: string): Promise<{ fileCount: number; totalBytes: number }> {
    try {
      const { data, error } = await supabase
        .from('group_files')
        .select('file_size')
        .eq('group_id', groupId);

      if (error) throw error;

      const files = data || [];
      return {
        fileCount: files.length,
        totalBytes: files.reduce((sum, f) => sum + f.file_size, 0),
      };
    } catch (error) {
      console.error('Error getting group storage usage:', error);
      throw error;
    }
  }

  /**
   * Clean up an orphaned database record when a storage upload fails.
   * This calls the delete edge function to remove the record safely.
   */
  private async cleanupOrphanedRecord(fileId: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/group-files-delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ file_id: fileId }),
        }
      );
    } catch {
      // Best-effort cleanup — the user can retry and the record will
      // be visible in their file list (with a broken download) if this fails.
    }
  }

  private mapRpcError(message: string): string {
    if (message.includes('not a member')) return 'You are not a member of this group.';
    if (message.includes('permission to upload')) return 'You do not have permission to upload files.';
    if (message.includes('size limit')) return 'The file exceeds the 10 MB size limit.';
    if (message.includes('File type not allowed')) return 'This file type is not supported.';
    if (message.includes('MIME type does not match')) return 'The file type does not match its extension.';
    if (message.includes('maximum of')) return 'This group has reached the maximum file count.';
    if (message.includes('storage quota')) return 'This upload would exceed the group storage quota.';
    return 'Could not process the file. Please try again.';
  }

  private mapDownloadError(status: number, message?: string): string {
    if (status === 401) return 'Authentication required.';
    if (status === 403) return 'You do not have permission to download this file.';
    if (status === 404) return 'File not found.';
    if (status === 500) return 'Could not generate a download link. Please try again.';
    return message || 'Download failed. Please try again.';
  }

  private mapDeleteError(status: number, message?: string): string {
    if (status === 401) return 'Authentication required.';
    if (status === 403) return message || 'You do not have permission to delete this file.';
    if (status === 404) return 'File not found.';
    if (status === 500) return 'Could not delete the file. Please try again.';
    return message || 'Delete failed. Please try again.';
  }
}

export const groupFilesAPI = new GroupFilesAPI();
