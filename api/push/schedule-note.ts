import {
  extractPushTestTarget,
  getErrorMessage,
  readJsonBody,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'
import { findPushSubscription, supabaseFetch } from './_supabase.js'

interface NotePushEventInput {
  eventDate?: unknown
  fireAt?: unknown
}

interface ScheduledNotePushInput {
  noteId?: unknown
  title?: unknown
  body?: unknown
  url?: unknown
  events?: unknown
}

interface ScheduledPushInsert {
  subscription_id: string
  fire_at: string
  type: 'note'
  title: string
  body: string
  url: string
  sent: false
  status: 'pending'
}

const readScheduleNoteInput = (body: unknown): ScheduledNotePushInput =>
  body && typeof body === 'object' ? (body as ScheduledNotePushInput) : {}

const readFutureEvents = (events: unknown): Array<{ eventDate: string; fireAt: string }> => {
  if (!Array.isArray(events)) {
    return []
  }

  const now = Date.now()

  return events.flatMap((event: NotePushEventInput) => {
    if (typeof event.eventDate !== 'string' || typeof event.fireAt !== 'string') {
      return []
    }

    const fireAt = new Date(event.fireAt)
    if (Number.isNaN(fireAt.getTime()) || fireAt.getTime() <= now) {
      return []
    }

    return [{ eventDate: event.eventDate, fireAt: fireAt.toISOString() }]
  })
}

const deleteFutureNotePushes = async (subscriptionId: string, url: string): Promise<void> => {
  const query = new URLSearchParams({
    subscription_id: `eq.${subscriptionId}`,
    type: 'eq.note',
    url: `eq.${url}`,
    sent: 'eq.false',
  })

  await supabaseFetch<null>(`scheduled_pushes?${query.toString()}`, { method: 'DELETE' })
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(request)
    const target = extractPushTestTarget(body)
    const subscription = await findPushSubscription(target)

    if (!subscription) {
      sendJson(response, 400, { ok: false, error: 'Subscription not found. Enable Web Push first.' })
      return
    }

    const input = readScheduleNoteInput(body)
    if (typeof input.noteId !== 'string' || !input.noteId.trim()) {
      sendJson(response, 400, { ok: false, error: 'Missing noteId' })
      return
    }

    const url = typeof input.url === 'string' ? input.url : `/?note=${encodeURIComponent(input.noteId)}`
    const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : 'Nhắc ghi chú'
    const message = typeof input.body === 'string' && input.body.trim() ? input.body.trim() : 'Bạn có ghi chú hôm nay.'
    const events = readFutureEvents(input.events)

    await deleteFutureNotePushes(subscription.id, url)

    if (events.length > 0) {
      const rows: ScheduledPushInsert[] = events.map((event) => ({
        subscription_id: subscription.id,
        fire_at: event.fireAt,
        type: 'note',
        title,
        body: message,
        url,
        sent: false,
        status: 'pending',
      }))

      await supabaseFetch<unknown>('scheduled_pushes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(rows),
      })
    }

    sendJson(response, 200, { ok: true, scheduled: events.length })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
