import { useEffect } from 'react'
import { CalendarPage } from '@/modules/calendar'
import { loadNotificationSettings, rescheduleNotifications, shouldUseNotifications } from '@/notifications'
import { catchUpDuePushes, getStoredWebPushSubscription } from '@/notifications/webPushClient'

export function AppShell() {
  useEffect(() => {
    const settings = loadNotificationSettings()
    if (shouldUseNotifications(settings)) {
      void rescheduleNotifications(settings)
    }

    // iOS suspends the JS thread when the PWA is backgrounded, so any server-scheduled
    // push that fired while the app was away needs to be dispatched now that we're foreground.
    if (getStoredWebPushSubscription()) {
      void catchUpDuePushes()
    }

    const handleVisibilityChange = () => {
      // Same catch-up on every foreground transition — the server deduplicates via sent=true.
      if (!document.hidden && getStoredWebPushSubscription()) {
        void catchUpDuePushes()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return <CalendarPage />
}
