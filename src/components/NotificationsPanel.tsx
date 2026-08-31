import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, CheckCheck, X, User, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { notificationApi, Notification } from '../lib/notificationApi';

interface NotificationsPanelProps {
  onClose?: () => void;
  showAsModal?: boolean;
  isAdmin?: boolean;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose, showAsModal = false, isAdmin = false }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      fetchUnreadCount();

      const unsubscribe = notificationApi.subscribeToNotifications((newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      return () => {
        unsubscribe();
      };
    } else {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAdmin]);

  const fetchNotifications = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const data = await notificationApi.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!isAdmin) return;
    
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!isAdmin) return;
    
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!isAdmin) return;
    
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'user_registered':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'subscription_activated':
        return <CreditCard className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const containerClasses = showAsModal
    ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    : '';

  const panelClasses = showAsModal
    ? 'bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col'
    : 'bg-white rounded-lg shadow-lg w-full flex flex-col';

  const content = (
    <div className={panelClasses}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <BellOff className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-red-600 text-center">{error}</p>
            <button
              onClick={fetchNotifications}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : !isAdmin ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <BellOff className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500 text-center">Access Denied</p>
            <p className="text-gray-400 text-sm text-center mt-1">
              Only site administrators can view notifications
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <BellOff className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500 text-center">No notifications yet</p>
            <p className="text-gray-400 text-sm text-center mt-1">
              You'll be notified when users register or subscribe
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 transition-colors ${
                  notification.read ? 'bg-white' : 'bg-blue-50'
                } hover:bg-gray-50`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex-shrink-0 text-blue-600 hover:text-blue-700 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {notification.data.user_email && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{notification.data.user_email}</span>
                          </div>
                        )}
                        {notification.data.email && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{notification.data.email}</span>
                          </div>
                        )}
                        {notification.data.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Registered: {new Date(notification.data.created_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {notification.data.activated_at && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            <span>
                              Subscribed: {new Date(notification.data.activated_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {notification.data.price_id && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Plan: {notification.data.price_id}</span>
                          </div>
                        )}
                        {notification.data.status && (
                          <div className="flex items-center gap-1">
                            <span className="capitalize">Status: {notification.data.status}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{formatDate(notification.created_at)}</span>
                      {notification.read && notification.read_at && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Read
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (showAsModal) {
    return <div className={containerClasses}>{content}</div>;
  }

  return content;
};

export default NotificationsPanel;
