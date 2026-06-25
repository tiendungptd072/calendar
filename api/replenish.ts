import {
  getErrorMessage,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './push/_shared.js'
import { generateScheduleForSub, supabaseFetch } from './push/_schedule.js'
import type { PushSubscriptionRow } from './push/_supabase.js'

const getAuthorization = (request: ApiRequest): string | undefined => {
  const authorization = request.headers.authorization

  return Array.isArray(authorization) ? authorization[0] : authorization
}

const isVercelCronRequest = (request: ApiRequest): boolean => {
  const userAgent = request.headers['user-agent']
  const cronSchedule = request.headers['x-vercel-cron-schedule']
  const normalizedUserAgent = Array.isArray(userAgent) ? userAgent[0] : userAgent

  return normalizedUserAgent === 'vercel-cron/1.0' && typeof cronSchedule === 'string'
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    sendJson(response, 500, { ok: false, error: 'Missing CRON_SECRET' })
    return
  }

  if (getAuthorization(request) !== `Bearer ${cronSecret}` && !isVercelCronRequest(request)) {
    sendJson(response, 401, { ok: false, error: 'Unauthorized' })
    return
  }

  try {
    const subscriptions = await supabaseFetch<PushSubscriptionRow[]>('push_subscriptions?select=*&is_active=eq.true', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    let scheduled = 0
    for (const subscription of subscriptions ?? []) {
      scheduled += await generateScheduleForSub(subscription)
    }

    sendJson(response, 200, { ok: true, refreshed: subscriptions?.length ?? 0, scheduled })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
