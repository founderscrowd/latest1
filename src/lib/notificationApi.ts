import { supabase } from './supabase';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  recipient_id: string | null;
  created_at: string;
  read_at: string | null;
}

export const notificationApi = {
  async getNotifications(limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }

    return count || 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  subscribeToNotifications(
    onNewNotification: (notification: Notification) => void
  ) {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          onNewNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },
};
