const WEB_PUSH_SUBSCRIPTION_KEY = 'lunar-calendar-web-push-subscription'

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

const normalizeReminderPreferences = (
  preferences: Partial<WebPushReminderPreferences> = {},
): WebPushReminderPreferences => ({
  leadDays: preferences.leadDays ?? 1,
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
