import { convertLunar2Solar } from '@/core/lunar'
import { listNotes } from '@/storage'
import type { CalendarNote } from '@/storage'

const WEB_PUSH_SUBSCRIPTION_KEY = 'lunar-calendar-web-push-subscription'
const VIETNAM_TIMEZONE = 7
const VIETNAM_TIMEZONE_OFFSET = '+07:00'

export interface StoredWebPushSubscription {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

interface PushSubscribeRequest {
  subscription: StoredWebPushSubscription
  timezone: string
  userAgent: string
  platform: string
  lead_days: number
  notify_hour: number
  notify_mung1: boolean
  notify_ram: boolean
}

interface NotePushEventRequest {
  eventDate: string
  fireAt: string
}

export type NoteWebPushSyncResult =
  | { status: 'not_needed' }
  | { status: 'missing_subscription' }
  | { status: 'no_future_events' }
  | { status: 'scheduled'; count: number }

export interface WebPushReminderPreferences {
  leadDays: number
  notifyHour: number
  notifyMung1: boolean
  notifyRam: boolean
}

export interface WebPushScheduleStatusRow {
  id: string
  type: string
  fire_at: string
  sent: boolean
  status: string
  error_message: string | null
}

export interface WebPushScheduleStatus {
  serverNow: string
  subscription: {
    id: string
    endpoint: string
    isActive: boolean
  }
  dispatch: {
    acceptedSecretEnvNames: string[]
  }
  pending: WebPushScheduleStatusRow[]
  due: WebPushScheduleStatusRow[]
  recent: WebPushScheduleStatusRow[]
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

export interface WebPushAvailability {
  supported: boolean
  isIos: boolean
  isStandalone: boolean
  reason?: string
}

const isPushSubscriptionJson = (value: unknown): value is StoredWebPushSubscription => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const subscription = value as Partial<StoredWebPushSubscription>

  return (
    typeof subscription.endpoint === 'string' &&
    !!subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  )
}

const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }

  return output
}

const arrayBufferToUrlBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export const getWebPushAvailability = (): WebPushAvailability => {
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone
  const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || isTouchMac
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      supported: false,
      isIos,
      isStandalone,
      reason: 'Trình duyệt này chưa hỗ trợ Web Push.',
    }
  }

  if (isIos && !isStandalone) {
    return {
      supported: false,
      isIos,
      isStandalone,
      reason: 'Trên iPhone/iPad, hãy Add to Home Screen rồi mở app từ Home Screen để bật thông báo.',
    }
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      isIos,
      isStandalone,
      reason: 'Web Push cần HTTPS hoặc localhost.',
    }
  }

  return { supported: true, isIos, isStandalone }
}

export const getStoredWebPushSubscription = (): StoredWebPushSubscription | null => {
  const rawSubscription = window.localStorage.getItem(WEB_PUSH_SUBSCRIPTION_KEY)

  if (!rawSubscription) {
    return null
  }

  try {
    const parsedSubscription: unknown = JSON.parse(rawSubscription)

    return isPushSubscriptionJson(parsedSubscription) ? parsedSubscription : null
  } catch {
    return null
  }
}

const storeWebPushSubscription = (subscription: StoredWebPushSubscription): void => {
  window.localStorage.setItem(WEB_PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription))
}

const clearStoredWebPushSubscription = (): void => {
  window.localStorage.removeItem(WEB_PUSH_SUBSCRIPTION_KEY)
}

const pad = (value: number): string => String(value).padStart(2, '0')

const getVapidPublicKey = (): string => {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.VAPID_PUBLIC_KEY

  if (!publicKey) {
    throw new Error('Thiếu VITE_VAPID_PUBLIC_KEY trên client.')
  }

  return publicKey
}

const getReadyServiceWorker = async (): Promise<ServiceWorkerRegistration> => navigator.serviceWorker.ready

const getUsablePushSubscription = async (
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> => {
  const existingSubscription = await registration.pushManager.getSubscription()
  const existingKey = existingSubscription?.options.applicationServerKey

  if (existingSubscription && existingKey && arrayBufferToUrlBase64(existingKey) === publicKey) {
    return existingSubscription
  }

  if (existingSubscription) {
    await existingSubscription.unsubscribe()
    clearStoredWebPushSubscription()
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
}

const getTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'

const getVietnamYear = (date = new Date()): number => {
  const shifted = new Date(date.getTime() + VIETNAM_TIMEZONE * 60 * 60 * 1000)

  return shifted.getUTCFullYear()
}

const toDateKey = (date: Date): string => {
  const shifted = new Date(date.getTime() + VIETNAM_TIMEZONE * 60 * 60 * 1000)

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

const addDays = (dateKey: string, delta: number): string => {
  const date = new Date(`${dateKey}T00:00:00${VIETNAM_TIMEZONE_OFFSET}`)
  date.setUTCDate(date.getUTCDate() + delta)

  return toDateKey(date)
}

const createFireDate = (eventDate: string, daysBefore: number, time: string): Date =>
  new Date(`${addDays(eventDate, -daysBefore)}T${time}:00${VIETNAM_TIMEZONE_OFFSET}`)

const normalizeReminderPreferences = (
  preferences: Partial<WebPushReminderPreferences> = {},
): WebPushReminderPreferences => ({
  leadDays: preferences.leadDays ?? 2,
  notifyHour: preferences.notifyHour ?? 7,
  notifyMung1: preferences.notifyMung1 ?? true,
  notifyRam: preferences.notifyRam ?? true,
})

export const subscribeWebPush = async (
  preferences?: Partial<WebPushReminderPreferences>,
): Promise<StoredWebPushSubscription> => {
  const availability = getWebPushAvailability()

  if (!availability.supported) {
    throw new Error(availability.reason)
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Bạn chưa cấp quyền thông báo.')
  }

  const registration = await getReadyServiceWorker()
  const subscription = await getUsablePushSubscription(registration, getVapidPublicKey())

  const subscriptionJson = subscription.toJSON()

  if (!isPushSubscriptionJson(subscriptionJson)) {
    throw new Error('Không đọc được push subscription từ trình duyệt.')
  }

  const reminderPreferences = normalizeReminderPreferences(preferences)
  const payload: PushSubscribeRequest = {
    subscription: subscriptionJson,
    timezone: getTimezone(),
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'unknown',
    lead_days: reminderPreferences.leadDays,
    notify_hour: reminderPreferences.notifyHour,
    notify_mung1: reminderPreferences.notifyMung1,
    notify_ram: reminderPreferences.notifyRam,
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('API subscribe chưa nhận subscription.')
  }

  storeWebPushSubscription(subscriptionJson)

  return subscriptionJson
}

const getNoteEventDates = (note: CalendarNote): string[] => {
  if (note.repeatType === 'none') {
    return [note.solarDate]
  }

  if (note.repeatType === 'yearly_solar') {
    const [, noteMonth, noteDay] = note.solarDate.split('-').map(Number)
    const currentYear = getVietnamYear()
    const eventDates: string[] = []

    for (let year = currentYear - 1; year <= currentYear + 3; year += 1) {
      eventDates.push(`${year}-${pad(noteMonth)}-${pad(noteDay)}`)
    }

    return eventDates
  }

  if (!note.lunarDate) {
    return []
  }

  const currentYear = getVietnamYear()
  const eventDates = new Set<string>()

  for (let lunarYear = currentYear - 1; lunarYear <= currentYear + 3; lunarYear += 1) {
    const solar = convertLunar2Solar(
      note.lunarDate.day,
      note.lunarDate.month,
      lunarYear,
      note.lunarDate.isLeapMonth ? 1 : 0,
      VIETNAM_TIMEZONE,
    )

    if (solar.year !== 0) {
      eventDates.add(`${solar.year}-${pad(solar.month)}-${pad(solar.day)}`)
    }
  }

  return [...eventDates]
}

const getNotePushEvents = (note: CalendarNote): NotePushEventRequest[] => {
  if (!note.reminder.enabled) {
    return []
  }

  const now = Date.now()

  return getNoteEventDates(note)
    .map((eventDate) => ({
      eventDate,
      fireAt: createFireDate(eventDate, note.reminder.daysBefore, note.reminder.time),
    }))
    .filter(({ fireAt }) => fireAt.getTime() > now)
    .map(({ eventDate, fireAt }) => ({ eventDate, fireAt: fireAt.toISOString() }))
}

const readScheduledCount = (value: unknown): number => {
  if (!value || typeof value !== 'object' || !('scheduled' in value)) {
    return 0
  }

  const scheduled = (value as { scheduled?: unknown }).scheduled

  return typeof scheduled === 'number' && Number.isFinite(scheduled) ? scheduled : 0
}

export const syncNoteWebPush = async (note: CalendarNote): Promise<NoteWebPushSyncResult> => {
  if (!note.reminder.enabled) {
    return { status: 'not_needed' }
  }

  const subscription = getStoredWebPushSubscription()
  if (!subscription) {
    return { status: 'missing_subscription' }
  }

  const events = getNotePushEvents(note)
  if (events.length === 0) {
    return { status: 'no_future_events' }
  }

  const response = await fetch('/api/push/schedule-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      noteId: note.id,
      title: note.title,
      body: note.note || 'Bạn có ghi chú trong Lịch âm Việt Nam',
      url: `/?note=${encodeURIComponent(note.id)}`,
      events,
    }),
  })
  const result: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
        ? result.error
        : 'API schedule-note chưa nhận lịch nhắc ghi chú.'

    throw new Error(message)
  }

  return { status: 'scheduled', count: readScheduledCount(result) }
}

export const removeNoteWebPush = async (noteId: string): Promise<void> => {
  const subscription = getStoredWebPushSubscription()
  if (!subscription) {
    return
  }

  const response = await fetch('/api/push/schedule-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      noteId,
      title: '',
      body: '',
      url: `/?note=${encodeURIComponent(noteId)}`,
      events: [],
    }),
  })

  if (!response.ok) {
    throw new Error('API schedule-note chưa xóa lịch nhắc ghi chú.')
  }
}

export const syncAllNoteWebPush = async (): Promise<number> => {
  const notes = await listNotes()
  const results = await Promise.all(notes.map((note) => syncNoteWebPush(note)))

  return results.filter((result) => result.status === 'scheduled').length
}

export const sendTestWebPush = async (
  subscription: StoredWebPushSubscription,
): Promise<{ sent: boolean; message: string }> => {
  const response = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      payload: {
        title: 'Lịch âm Việt Nam',
        body: 'Thông báo thử đã gửi thành công từ PWA.',
        url: '/',
        tag: 'lunar-calendar-test',
      },
    }),
  })

  const result: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Không gửi được test notification.'

    throw new Error(message)
  }

  return { sent: true, message: 'Đã gửi test notification.' }
}

// Dispatch all overdue pushes for this device. Called on app open and every foreground
// transition to compensate for iOS freezing JS timers while the PWA is backgrounded.
// Omitting noteId tells the server to dispatch every pending row for this subscription,
// not just a specific note. Fire-and-forget — the hourly cron is the primary delivery path.
export const catchUpDuePushes = async (): Promise<void> => {
  const subscription = getStoredWebPushSubscription()
  if (!subscription) {
    return
  }

  await fetch('/api/push/dispatch-due', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined)
}

export const getWebPushScheduleStatus = async (
  subscription: StoredWebPushSubscription,
): Promise<WebPushScheduleStatus> => {
  const response = await fetch('/api/push/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
  })

  const result: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Không kiểm tra được lịch nhắc.'

    throw new Error(message)
  }

  return result as WebPushScheduleStatus
}
