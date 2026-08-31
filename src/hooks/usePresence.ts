import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { chatAPI } from '../lib/chatApi';

export const usePresence = () => {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout>();
  const isOnlineRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    // Set initial online status with error handling
    const setInitialPresence = async () => {
      try {
        await chatAPI.updatePresence('online');
      } catch (error) {
        console.warn('Could not set initial presence:', error);
        // Don't throw error, just log it
      }
    };
    
    setInitialPresence();

    // Update presence every 30 seconds
    intervalRef.current = setInterval(() => {
      if (isOnlineRef.current) {
        chatAPI.updatePresence('online').catch(() => {
          // Silently handle errors in interval updates
        });
      }
    }, 60000); // Reduced frequency to 60 seconds

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isOnlineRef.current = false;
        chatAPI.updatePresence('away').catch(() => {});
      } else {
        isOnlineRef.current = true;
        chatAPI.updatePresence('online').catch(() => {});
      }
    };

    // Handle beforeunload (user leaving)
    const handleBeforeUnload = () => {
      chatAPI.updatePresence('offline').catch(() => {});
    };

    // Handle focus/blur
    const handleFocus = () => {
      isOnlineRef.current = true;
      chatAPI.updatePresence('online').catch(() => {});
    };

    const handleBlur = () => {
      isOnlineRef.current = false;
      chatAPI.updatePresence('away').catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      // Set offline status when component unmounts
      if (user) {
        chatAPI.updatePresence('offline');
      }
    };
  }, [user]);

  return null; // This hook doesn't return anything, it just manages presence
};