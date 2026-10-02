import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare, MessagesSquare, FileText, User, Bell } from 'lucide-react';
import { notificationApi, Notification } from '../lib/notificationApi';
import { useNavigate } from 'react-router-dom';

interface NotificationToast {
  id: string;
  notification: Notification;
  visible: boolean;
}

const NotificationToasts: React.FC = () => {
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const navigate = useNavigate();
  const toastTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (toastTimeoutsRef.current[id]) {
      clearTimeout(toastTimeoutsRef.current[id]);
      delete toastTimeoutsRef.current[id];
    }
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    const data = notification.data || {};
    if (notification.type === 'new_message') {
      if (data.group_slug) navigate(`/groups/${data.group_slug}/manage`);
      else if (data.group_id) navigate(`/groups/${data.group_id}/manage`);
    } else if (notification.type === 'forum_reply' || notification.type === 'forum_topic') {
      if (data.group_slug) navigate(`/groups/${data.group_slug}/manage`);
      else if (data.group_id) navigate(`/groups/${data.group_id}/manage`);
    }
    removeToast(notification.id);
  }, [navigate, removeToast]);

  useEffect(() => {
    const unsubscribe = notificationApi.subscribeToNotifications((newNotification) => {
      const toastId = newNotification.id;
      setToasts((prev) => [...prev, { id: toastId, notification: newNotification, visible: true }]);
      toastTimeoutsRef.current[toastId] = setTimeout(() => {
        setToasts((prev) => prev.map((t) => t.id === toastId ? { ...t, visible: false } : t));
        setTimeout(() => removeToast(toastId), 300);
      }, 5000);
    });

    return () => {
      unsubscribe();
      Object.values(toastTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [removeToast]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return <MessageSquare className="w-5 h-5 text-emerald-500" />;
      case 'forum_reply':
        return <MessagesSquare className="w-5 h-5 text-orange-500" />;
      case 'forum_topic':
        return <FileText className="w-5 h-5 text-orange-500" />;
      case 'user_registered':
        return <User className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`bg-white rounded-lg shadow-lg border border-slate-200 p-4 pointer-events-auto cursor-pointer transition-all duration-300 ${
            toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
          onClick={() => handleNotificationClick(toast.notification)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">
                {toast.notification.title || toast.notification.message}
              </p>
              {toast.notification.title && (
                <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">
                  {toast.notification.message}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToasts;
