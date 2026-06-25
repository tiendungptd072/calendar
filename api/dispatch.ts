import {
  configureWebPush,
  getErrorMessage,
  sendJson,
  webPush,
  type ApiRequest,
  type ApiResponse,
  type WebPushSubscriptionPayload,
} from './push/_shared.js'
import { generateScheduleForSub, supabaseFetch } from './push/_schedule.js'
import type { PushSubscriptionRow } from './push/_supabase.js'

interface ScheduledPushDueRow {
  id: string
  title: string | null
  body: string | null
  url: string | null
  subscription_id: string
  push_subscriptions?: {
    subscription?: WebPushSubscriptionPayload
    is_active?: boolean
  } | Array<{
    subscription?: WebPushSubscriptionPayload
    is_active?: boolean
  }>
}

interface WebPushSendError {
  statusCode?: number
  body?: unknown
}

const getAuthorization = (request: ApiRequest): string | undefined => {
  const authorization = request.headers.authorization

  return Array.isArray(authorization) ? authorization[0] : authorization
}

const getEmbeddedSubscription = (row: ScheduledPushDueRow): WebPushSubscriptionPayload | null => {
  const embedded = Array.isArray(row.push_subscriptions) ? row.push_subscriptions[0] : row.push_subscriptions

  return embedded?.subscription ?? null
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    sendJson(response, 500, { ok: false, error: 'Missing CRON_SECRET' })
    return
  }

  if (getAuthorization(request) !== `Bearer ${cronSecret}`) {
    sendJson(response, 401, { ok: false, error: 'Unauthorized' })
    return
  }

  const config = configureWebPush()
  if (!config.ready) {
    sendJson(response, 500, {
      ok: false,
      error: `Missing VAPID env: ${config.missing.join(', ')}`,
    })
    return
  }

  try {
    const subscriptions = await supabaseFetch<PushSubscriptionRow[]>('push_subscriptions?select=*&is_active=eq.true', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    let refreshed = 0

    for (const subscription of subscriptions ?? []) {
      refreshed += await generateScheduleForSub(subscription)
    }

    const now = encodeURIComponent(new Date().toISOString())
    const due = await supabaseFetch<ScheduledPushDueRow[]>(
      `scheduled_pushes?select=id,title,body,url,subscription_id,push_subscriptions!inner(subscription,is_active)` +
        `&fire_at=lte.${now}&sent=eq.false&status=eq.pending&push_subscriptions.is_active=eq.true&order=fire_at.asc&limit=100`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    )

    let sent = 0

    for (const row of due ?? []) {
      const subscription = getEmbeddedSubscription(row)

      if (!subscription) {
        continue
      }

      try {
        await webPush.sendNotification(
          subscription,
          JSON.stringify({
            title: row.title ?? 'Lịch âm Việt Nam',
            body: row.body ?? '',
            url: row.url ?? '/',
          }),
        )
        await supabaseFetch<null>(`scheduled_pushes?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sent: true,
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          }),
        })
        sent += 1
      } catch (error) {
        const pushError = error as WebPushSendError
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabaseFetch<null>(`push_subscriptions?id=eq.${row.subscription_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              is_active: false,
              updated_at: new Date().toISOString(),
            }),
          })
        }

        await supabaseFetch<null>(`scheduled_pushes?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'failed',
            error_message: `web-push ${pushError.statusCode ?? 'unknown'}: ${
              typeof pushError.body === 'string' ? pushError.body : 'send failed'
            }`,
          }),
        })

        console.error('push fail', pushError.statusCode, pushError.body)
      }
    }

    sendJson(response, 200, { ok: true, refreshed, processed: due?.length ?? 0, sent })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
