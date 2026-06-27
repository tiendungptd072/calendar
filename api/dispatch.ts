import {
  configureWebPush,
  getErrorMessage,
  sendJson,
  webPush,
  type ApiRequest,
  type ApiResponse,
} from './push/_shared.js'
import { hasDispatchSecret, isDispatchAuthorized } from './push/_dispatchAuth.js'
import { supabaseFetch } from './push/_schedule.js'
import { listPushSubscriptionsByIds } from './push/_supabase.js'

interface ScheduledPushDueRow {
  id: string
  title: string | null
  body: string | null
  url: string | null
  subscription_id: string
}

interface WebPushSendError {
  statusCode?: number
  body?: unknown
}

const patchScheduledPush = async (id: string, body: Record<string, unknown>): Promise<void> => {
  await supabaseFetch<null>(`scheduled_pushes?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const markScheduledPushFailed = async (id: string, message: string): Promise<void> => {
  await patchScheduledPush(id, {
    status: 'failed',
    error_message: message,
  })
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  if (!hasDispatchSecret() || !isDispatchAuthorized(request)) {
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
    const now = encodeURIComponent(new Date().toISOString())
    const due = await supabaseFetch<ScheduledPushDueRow[]>(
      `scheduled_pushes?select=id,title,body,url,subscription_id` +
        `&fire_at=lte.${now}&sent=eq.false&status=neq.failed&order=fire_at.asc&limit=100`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    )

    let sent = 0
    let skipped = 0
    let failed = 0
    const subscriptionById = await listPushSubscriptionsByIds((due ?? []).map((row) => row.subscription_id))

    for (const row of due ?? []) {
      const subscription = subscriptionById.get(row.subscription_id)

      if (!subscription || subscription.is_active === false) {
        await markScheduledPushFailed(row.id, 'subscription missing or inactive')
        skipped += 1
        continue
      }

      try {
        await webPush.sendNotification(
          subscription.subscription,
          JSON.stringify({
            title: row.title ?? 'Lịch âm Việt Nam',
            body: row.body ?? '',
            url: row.url ?? '/',
          }),
          { urgency: 'high', TTL: 3600 },
        )
        await patchScheduledPush(row.id, {
          sent: true,
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
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

        await markScheduledPushFailed(
          row.id,
          `web-push ${pushError.statusCode ?? 'unknown'}: ${
            typeof pushError.body === 'string' ? pushError.body : 'send failed'
          }`,
        )
        failed += 1

        console.error('push fail', pushError.statusCode, pushError.body)
      }
    }

    sendJson(response, 200, { ok: true, processed: due?.length ?? 0, sent, skipped, failed })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
