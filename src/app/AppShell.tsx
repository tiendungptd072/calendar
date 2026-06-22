import { useEffect } from 'react'
import { CalendarPage } from '@/modules/calendar'
import { loadNotificationSettings, rescheduleNotifications, shouldUseNotifications } from '@/notifications'

export function AppShell() {
  useEffect(() => {
    // App-open maintenance: rebuild the native local-notification queue only after the user
    // has enabled reminders before. This avoids surprise permission prompts on first launch.
    const settings = loadNotificationSettings()
    if (shouldUseNotifications(settings)) {
      void rescheduleNotifications(settings)
    }
  }, [])

  return <CalendarPage />
}
