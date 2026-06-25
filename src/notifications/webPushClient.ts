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

export interface WebPushReminderPreferences {
  leadDays: number
  notifyHour: number
  notifyMung1: boolean
  notifyRam: boolean
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

const pad = (value: number): string => String(value).padStart(2, '0')

const getVapidPublicKey = (): string => {
  const publicKey = import.meta.env.VAPID_PUBLIC_KEY || import.meta.env.VITE_VAPID_PUBLIC_KEY

  if (!publicKey) {
    throw new Error('Thiếu VAPID_PUBLIC_KEY trên client.')
  }

  return publicKey
}

const getReadyServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!navigator.serviceWorker.controller) {
    await navigator.serviceWorker.register('/sw.js')
  }

  return navigator.serviceWorker.ready
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
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()),
    }))

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

export const syncNoteWebPush = async (note: CalendarNote): Promise<void> => {
  const subscription = getStoredWebPushSubscription()
  if (!subscription) {
    return
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
      events: getNotePushEvents(note),
    }),
  })

  if (!response.ok) {
    throw new Error('API schedule-note chưa nhận lịch nhắc ghi chú.')
  }
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

  await Promise.all(notes.map((note) => syncNoteWebPush(note)))

  return notes.length
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
