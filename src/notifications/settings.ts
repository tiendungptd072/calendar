import type { AppNotificationSettings, NotificationReminderConfig } from './types'

const SETTINGS_KEY = 'lunar-calendar-notification-settings'

export const DEFAULT_REMINDER: NotificationReminderConfig = {
  enabled: false,
  daysBefore: 0,
  time: '08:00',
}

export const DEFAULT_NOTIFICATION_SETTINGS: AppNotificationSettings = {
  mung1: DEFAULT_REMINDER,
  ram: DEFAULT_REMINDER,
  notesEnabled: false,
}

const isReminderConfig = (value: unknown): value is NotificationReminderConfig => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<NotificationReminderConfig>

  return (
    typeof candidate.enabled === 'boolean' &&
    typeof candidate.daysBefore === 'number' &&
    typeof candidate.time === 'string'
  )
}

export function loadNotificationSettings(): AppNotificationSettings {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_NOTIFICATION_SETTINGS
  }

  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) {
    return DEFAULT_NOTIFICATION_SETTINGS
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppNotificationSettings>

    return {
      mung1: isReminderConfig(parsed.mung1) ? parsed.mung1 : DEFAULT_REMINDER,
      ram: isReminderConfig(parsed.ram) ? parsed.ram : DEFAULT_REMINDER,
      notesEnabled: typeof parsed.notesEnabled === 'boolean' ? parsed.notesEnabled : false,
    }
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS
  }
}

export function saveNotificationSettings(settings: AppNotificationSettings): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export const shouldUseNotifications = (settings: AppNotificationSettings): boolean =>
  settings.mung1.enabled || settings.ram.enabled || settings.notesEnabled
