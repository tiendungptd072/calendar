import {
  extractPushTestTarget,
  getErrorMessage,
  readJsonBody,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'
import { getDispatchSecretNames } from './_dispatchAuth.js'
import { findPushSubscription, supabaseFetch } from './_supabase.js'

interface ScheduledPushStatusRow {
  id: string
  type: string
  fire_at: string
  sent: boolean
  status: string
  error_message: string | null
}

const SCHEDULE_STATUS_SELECT = 'id,type,fire_at,sent,status,error_message'

const getPendingRows = async (subscriptionId: string): Promise<ScheduledPushStatusRow[]> => {
  const query = new URLSearchParams({
    select: SCHEDULE_STATUS_SELECT,
    subscription_id: `eq.${subscriptionId}`,
    sent: 'eq.false',
    status: 'eq.pending',
    order: 'fire_at.asc',
    limit: '20',
  })

  return supabaseFetch<ScheduledPushStatusRow[]>(`scheduled_pushes?${query.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
}

const getRecentRows = async (subscriptionId: string): Promise<ScheduledPushStatusRow[]> => {
  const query = new URLSearchParams({
    select: SCHEDULE_STATUS_SELECT,
    subscription_id: `eq.${subscriptionId}`,
    order: 'fire_at.desc',
    limit: '20',
  })

  return supabaseFetch<ScheduledPushStatusRow[]>(`scheduled_pushes?${query.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(request)
    const subscription = await findPushSubscription(extractPushTestTarget(body))

    if (!subscription) {
      sendJson(response, 400, { ok: false, error: 'Subscription not found. Enable Web Push first.' })
      return
    }

    const [pending, recent] = await Promise.all([getPendingRows(subscription.id), getRecentRows(subscription.id)])
    const now = new Date()
    const due = pending.filter((row) => new Date(row.fire_at).getTime() <= now.getTime())

    sendJson(response, 200, {
      ok: true,
      serverNow: now.toISOString(),
      subscription: {
        id: subscription.id,
        endpoint: subscription.endpoint,
        isActive: subscription.is_active !== false,
      },
      dispatch: {
        acceptedSecretEnvNames: getDispatchSecretNames(),
      },
      pending,
      due,
      recent,
    })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
