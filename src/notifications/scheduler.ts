import { convertLunar2Solar, getDayInfo } from '@/core/lunar'
import { listNotes } from '@/storage'
import type { CalendarNote } from '@/storage'
import {
  cancelAppNotifications,
  hasNotificationPermission,
  isNativeNotificationAvailable,
  requestNotificationPermission,
  scheduleAppNotifications,
} from './nativeNotifications'
import { loadNotificationSettings, shouldUseNotifications } from './settings'
import type {
  AppNotificationSettings,
  NotificationReminderConfig,
  ScheduledAppNotification,
} from './types'

const MAX_PENDING_NOTIFICATIONS = 50
const VIETNAM_TIMEZONE = 7

// iOS keeps a limited local-notification queue, commonly documented/observed around 64 pending.
// Keep the app comfortably below that and rebuild the queue whenever the app opens or settings change.
const pad = (value: number): string => String(value).padStart(2, '0')

const toDateKey = (year: number, month: number, day: number): string =>
  `${year}-${pad(month)}-${pad(day)}`

const createVietnamDate = (dateKey: string, time: string): Date => new Date(`${dateKey}T${time}:00+07:00`)

const addDays = (dateKey: string, delta: number): string => {
  const base = new Date(`${dateKey}T12:00:00+07:00`)
  base.setUTCDate(base.getUTCDate() + delta)

  return toDateKey(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate())
}

const notificationId = (kindSeed: number, dateKey: string, stableSeed = 0): number => {
  const numericDate = Number(dateKey.replaceAll('-', ''))

  return kindSeed * 100_000_000 + numericDate + stableSeed
}

const createFireDate = (eventDate: string, reminder: NotificationReminderConfig): Date =>
  createVietnamDate(addDays(eventDate, -reminder.daysBefore), reminder.time)

const isFuture = (date: Date, now: Date): boolean => date.getTime() > now.getTime()

function buildLunarEventNotifications(
  settings: AppNotificationSettings,
  now: Date,
): ScheduledAppNotification[] {
  const today = getDayInfo(now, { timeZone: VIETNAM_TIMEZONE }).solar
  const startYear = today.year
  const events: ScheduledAppNotification[] = []

  for (let year = startYear; year <= startYear + 3; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      if (settings.mung1.enabled) {
        const solar = convertLunar2Solar(1, month, year, 0, VIETNAM_TIMEZONE)
        const eventDate = toDateKey(solar.year, solar.month, solar.day)
        const fireAt = createFireDate(eventDate, settings.mung1)
        if (isFuture(fireAt, now)) {
          events.push({
            id: notificationId(1, eventDate),
            kind: 'mung1',
            title: 'Nhắc mùng 1',
            body: `Ngày mai/lúc hẹn là mùng 1 âm lịch ${month}/${year}`,
            eventDate,
            fireAt,
          })
        }
      }

      if (settings.ram.enabled) {
        const solar = convertLunar2Solar(15, month, year, 0, VIETNAM_TIMEZONE)
        const eventDate = toDateKey(solar.year, solar.month, solar.day)
        const fireAt = createFireDate(eventDate, settings.ram)
        if (isFuture(fireAt, now)) {
          events.push({
            id: notificationId(2, eventDate),
            kind: 'ram',
            title: 'Nhắc ngày rằm',
            body: `Ngày mai/lúc hẹn là rằm âm lịch ${month}/${year}`,
            eventDate,
            fireAt,
          })
        }
      }
    }
  }

  return events
}

function noteEventDateForYear(note: CalendarNote, year: number): string | null {
  if (note.repeatType !== 'yearly_lunar' || !note.lunarDate) {
    return note.solarDate
  }

  const solar = convertLunar2Solar(
    note.lunarDate.day,
    note.lunarDate.month,
    year,
    note.lunarDate.isLeapMonth ? 1 : 0,
    VIETNAM_TIMEZONE,
  )

  if (solar.year === 0) {
    return null
  }

  return toDateKey(solar.year, solar.month, solar.day)
}

function buildNoteNotifications(notes: CalendarNote[], now: Date): ScheduledAppNotification[] {
  const today = getDayInfo(now, { timeZone: VIETNAM_TIMEZONE }).solar
  const events: ScheduledAppNotification[] = []

  for (const note of notes) {
    if (!note.reminder.enabled) {
      continue
    }

    const years = note.repeatType === 'yearly_lunar' ? [today.year, today.year + 1, today.year + 2] : [0]

    for (const year of years) {
      const eventDate = note.repeatType === 'yearly_lunar' ? noteEventDateForYear(note, year) : note.solarDate

      if (!eventDate) {
        continue
      }

      const fireAt = createFireDate(eventDate, note.reminder)
      if (!isFuture(fireAt, now)) {
        continue
      }

      const seed = note.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 10_000
      events.push({
        id: notificationId(3, eventDate, seed),
        kind: 'note',
        title: note.title,
        body: note.note || 'Bạn có ghi chú trong Lịch âm Việt Nam',
        eventDate,
        fireAt,
      })
    }
  }

  return events
}

export async function buildUpcomingNotifications(
  settings: AppNotificationSettings,
  now = new Date(),
): Promise<ScheduledAppNotification[]> {
  const notes = settings.notesEnabled ? await listNotes() : []

  return [...buildLunarEventNotifications(settings, now), ...buildNoteNotifications(notes, now)]
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_PENDING_NOTIFICATIONS)
}

export async function rescheduleNotifications(
  settings = loadNotificationSettings(),
  options: { requestPermission?: boolean } = {},
): Promise<{ scheduled: number; nativeAvailable: boolean; permissionGranted: boolean }> {
  await cancelAppNotifications()

  if (!shouldUseNotifications(settings)) {
    return { scheduled: 0, nativeAvailable: isNativeNotificationAvailable(), permissionGranted: false }
  }

  const permissionGranted = options.requestPermission
    ? await requestNotificationPermission()
    : await hasNotificationPermission()
  if (!permissionGranted) {
    return { scheduled: 0, nativeAvailable: isNativeNotificationAvailable(), permissionGranted }
  }

  const notifications = await buildUpcomingNotifications(settings)
  await scheduleAppNotifications(notifications)

  return {
    scheduled: notifications.length,
    nativeAvailable: isNativeNotificationAvailable(),
    permissionGranted,
  }
}

export { MAX_PENDING_NOTIFICATIONS }
