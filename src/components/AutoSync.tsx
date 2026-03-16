'use client';

import { useEffect, useRef, useCallback } from 'react';
import { showToast } from './Toast';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendDesktopNotification(title: string, body: string, url?: string) {
  // Electron native notifications
  const electronAPI = (window as unknown as { electronAPI?: { showNotification: (opts: { title: string; body: string }) => void; isElectron: boolean } }).electronAPI;
  if (electronAPI?.isElectron) {
    electronAPI.showNotification({ title, body });
    return;
  }

  // Web Notification API fallback
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: title,
  });

  if (url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
      notification.close();
    };
  }

  setTimeout(() => notification.close(), 8000);
}

export default function AutoSync() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstSync = useRef(true);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const doSync = useCallback(async () => {
    const skipNotifications = isFirstSync.current;
    isFirstSync.current = false;

    // Gmail sync
    try {
      const res = await fetch('/api/sync/gmail', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.synced > 0) {
          showToast(
            `Synced ${data.threads} threads (${data.synced} messages)`,
            'success'
          );

          // Desktop notification for new mail (skip first sync to avoid spam)
          if (!skipNotifications && data.synced > 0) {
            sendDesktopNotification(
              'New mail',
              data.synced === 1
                ? '1 new message'
                : `${data.synced} new messages`,
              '/email'
            );
          }
        }
      }
    } catch {
      // Best-effort — fail silently
    }

    // Calendar sync (separate, non-blocking)
    try {
      const res = await fetch('/api/sync/calendar', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.eventsProcessed > 0) {
          showToast(
            `Synced ${data.eventsProcessed} calendar events`,
            'success'
          );

          // Desktop notification for new meetings
          if (!skipNotifications && data.eventsCreated > 0) {
            sendDesktopNotification(
              'New meeting',
              data.eventsCreated === 1
                ? '1 new event added to your calendar'
                : `${data.eventsCreated} new events added`,
              '/calendar'
            );
          }
        }
      }
    } catch {
      // Best-effort — fail silently
    }
  }, []);

  useEffect(() => {
    // Start polling after initial delay
    const initialDelay = setTimeout(() => {
      doSync();
      intervalRef.current = setInterval(doSync, SYNC_INTERVAL);
    }, 5000); // Wait 5s before first auto-sync

    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [doSync]);

  return null; // Invisible component
}
