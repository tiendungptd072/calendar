import webPush from 'web-push'
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ApiRequest extends IncomingMessage {
  body?: unknown
  method?: string
}

export type ApiResponse = ServerResponse

export interface WebPushSubscriptionPayload {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export interface WebPushMessagePayload {
  title: string
  body: string
  url: string
  tag: string
}

export interface PushSubscriptionMetadata {
  timezone: string
  userAgent: string
  platform: string
}

export interface PushTestTarget {
  endpoint?: string
  subscriptionId?: string
}

export const sendJson = (response: ApiResponse, statusCode: number, body: unknown): void => {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

const parseBody = (rawBody: string): unknown => {
  if (!rawBody) {
    return {}
  }

  return JSON.parse(rawBody)
}

export const readJsonBody = async (request: ApiRequest): Promise<unknown> => {
  if (request.body !== undefined) {
    return typeof request.body === 'string' ? parseBody(request.body) : request.body
  }

  return new Promise((resolve, reject) => {
    let rawBody = ''

    request.on('data', (chunk: Buffer | string) => {
      rawBody += chunk.toString()
    })

    request.on('end', () => {
      try {
        resolve(parseBody(rawBody))
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', reject)
  })
}

export const isWebPushSubscription = (value: unknown): value is WebPushSubscriptionPayload => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const subscription = value as Partial<WebPushSubscriptionPayload>

  return (
    typeof subscription.endpoint === 'string' &&
    !!subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  )
}

export const extractSubscription = (body: unknown): WebPushSubscriptionPayload | null => {
  if (isWebPushSubscription(body)) {
    return body
  }

  if (body && typeof body === 'object' && 'subscription' in body) {
    const subscription = (body as { subscription?: unknown }).subscription

    return isWebPushSubscription(subscription) ? subscription : null
  }

  return null
}

export const extractMessagePayload = (body: unknown): WebPushMessagePayload => {
  const fallback: WebPushMessagePayload = {
    title: 'Lịch âm Việt Nam',
    body: 'Đây là thông báo thử từ PWA.',
    url: '/',
    tag: 'lunar-calendar-test',
  }

  if (!body || typeof body !== 'object' || !('payload' in body)) {
    return fallback
  }

  const payload = (body as { payload?: unknown }).payload
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const partialPayload = payload as Partial<WebPushMessagePayload>

  return {
    title: typeof partialPayload.title === 'string' ? partialPayload.title : fallback.title,
    body: typeof partialPayload.body === 'string' ? partialPayload.body : fallback.body,
    url: typeof partialPayload.url === 'string' ? partialPayload.url : fallback.url,
    tag: typeof partialPayload.tag === 'string' ? partialPayload.tag : fallback.tag,
  }
}

export const extractSubscriptionMetadata = (body: unknown): PushSubscriptionMetadata => {
  if (!body || typeof body !== 'object') {
    return {
      timezone: 'Asia/Ho_Chi_Minh',
      userAgent: 'unknown',
      platform: 'unknown',
    }
  }

  const payload = body as {
    timezone?: unknown
    userAgent?: unknown
    user_agent?: unknown
    platform?: unknown
  }

  return {
    timezone: typeof payload.timezone === 'string' ? payload.timezone : 'Asia/Ho_Chi_Minh',
    userAgent:
      typeof payload.userAgent === 'string'
        ? payload.userAgent
        : typeof payload.user_agent === 'string'
          ? payload.user_agent
          : 'unknown',
    platform: typeof payload.platform === 'string' ? payload.platform : 'unknown',
  }
}

export const extractPushTestTarget = (body: unknown): PushTestTarget => {
  if (!body || typeof body !== 'object') {
    return {}
  }

  const payload = body as {
    endpoint?: unknown
    subscription_id?: unknown
    subscriptionId?: unknown
  }

  return {
    endpoint: typeof payload.endpoint === 'string' ? payload.endpoint : undefined,
    subscriptionId:
      typeof payload.subscriptionId === 'string'
        ? payload.subscriptionId
        : typeof payload.subscription_id === 'string'
          ? payload.subscription_id
          : undefined,
  }
}

export const configureWebPush = (): { ready: true } | { ready: false; missing: string[] } => {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  const envPairs: Array<[string, string | undefined]> = [
    ['VAPID_PUBLIC_KEY', publicKey],
    ['VAPID_PRIVATE_KEY', privateKey],
    ['VAPID_SUBJECT', subject],
  ]

  const missing = envPairs
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0 || !publicKey || !privateKey || !subject) {
    return { ready: false, missing }
  }

  webPush.setVapidDetails(subject, publicKey, privateKey)

  return { ready: true }
}

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error'

export { webPush }
