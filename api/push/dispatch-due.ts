import {
  configureWebPush,
  extractPushTestTarget,
  getErrorMessage,
  readJsonBody,
  sendJson,
  webPush,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'
import { findPushSubscription, supabaseFetch } from './_supabase.js'

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

const getNoteUrlFilter = (body: unknown): string | null => {
  if (!body || typeof body !== 'object' || !('noteId' in body)) {
    return null
  }

  const noteId = (body as { noteId?: unknown }).noteId

  return typeof noteId === 'string' && noteId.trim() ? `/?note=${encodeURIComponent(noteId)}` : null
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method not allowed' })
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
    const body = await readJsonBody(request)
    const subscription = await findPushSubscription(extractPushTestTarget(body))

    if (!subscription) {
      sendJson(response, 400, { ok: false, error: 'Subscription not found. Enable Web Push first.' })
      return
    }

    if (subscription.is_active === false) {
      sendJson(response, 400, { ok: false, error: 'Subscription is inactive. Enable Web Push again.' })
      return
    }

    const now = new Date().toISOString()
    const query = new URLSearchParams({
      select: 'id,title,body,url,subscription_id',
      subscription_id: `eq.${subscription.id}`,
      fire_at: `lte.${now}`,
      sent: 'eq.false',
      status: 'eq.pending',
      order: 'fire_at.asc',
      limit: '25',
    })
    const noteUrl = getNoteUrlFilter(body)

    if (noteUrl) {
      query.set('url', `eq.${noteUrl}`)
    }

    const due = await supabaseFetch<ScheduledPushDueRow[]>(`scheduled_pushes?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    let sent = 0

    for (const row of due ?? []) {
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
      }
    }

    sendJson(response, 200, { ok: true, processed: due?.length ?? 0, sent })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
