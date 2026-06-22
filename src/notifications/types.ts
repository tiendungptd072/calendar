export interface NotificationReminderConfig {
  enabled: boolean
  daysBefore: number
  time: string
}

export interface AppNotificationSettings {
  mung1: NotificationReminderConfig
  ram: NotificationReminderConfig
  notesEnabled: boolean
}

export type NotificationKind = 'mung1' | 'ram' | 'note'

export interface ScheduledAppNotification {
  id: number
  kind: NotificationKind
  title: string
  body: string
  eventDate: string
  fireAt: Date
}
