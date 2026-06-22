import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { ScheduledAppNotification } from './types'

const APP_NOTIFICATION_PREFIX = 'lunar-calendar'

// Browser/PWA builds do not have Capacitor native plugins. Every native call goes through this
// guard so local notification code is safe to import and call on web without crashing.
export const isNativeNotificationAvailable = (): boolean => Capacitor.isNativePlatform()

export async function hasNotificationPermission(): Promise<boolean> {
  if (!isNativeNotificationAvailable()) {
    return false
  }

  const current = await LocalNotifications.checkPermissions()

  return current.display === 'granted'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativeNotificationAvailable()) {
    return false
  }

  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') {
    return true
  }

  const requested = await LocalNotifications.requestPermissions()

  return requested.display === 'granted'
}

export async function cancelAppNotifications(): Promise<void> {
  if (!isNativeNotificationAvailable()) {
    return
  }

  const pending = await LocalNotifications.getPending()
  const appPending = pending.notifications.filter((notification) =>
    String(notification.extra?.source ?? '').startsWith(APP_NOTIFICATION_PREFIX),
  )

  if (appPending.length === 0) {
    return
  }

  await LocalNotifications.cancel({
    notifications: appPending.map((notification) => ({ id: notification.id })),
  })
}

export async function scheduleAppNotifications(notifications: ScheduledAppNotification[]): Promise<void> {
  if (!isNativeNotificationAvailable() || notifications.length === 0) {
    return
  }

  await LocalNotifications.schedule({
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      schedule: { at: notification.fireAt },
      extra: {
        source: `${APP_NOTIFICATION_PREFIX}:${notification.kind}`,
        eventDate: notification.eventDate,
      },
    })),
  })
}
