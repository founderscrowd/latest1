import { supabase } from './supabase';

export interface Notification {
  id: string;
  type: string;
  title: string | null;
  message: string;
  data: Record<string, any>;
  read: boolean;
  is_read: boolean;
  recipient_id: string | null;
  user_id: string;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
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

    return (data || []).map((n: any) => ({
      ...n,
      read: n.read ?? n.is_read ?? false,
    })) as Notification[];
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or('read.eq.false,is_read.eq.false');

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, is_read: true, read_at: new Date().toISOString() })
      .or('read.eq.false,is_read.eq.false');

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
          onNewNotification({ ...payload.new, read: (payload.new as any).read ?? (payload.new as any).is_read ?? false } as Notification);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },
};
