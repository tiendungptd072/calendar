import {
  getErrorMessage,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './push/_shared.js'
import { hasDispatchSecret, isDispatchAuthorized } from './push/_dispatchAuth.js'
import { generateScheduleForSub, supabaseFetch } from './push/_schedule.js'
import type { PushSubscriptionRow } from './push/_supabase.js'

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  if (!hasDispatchSecret() || !isDispatchAuthorized(request)) {
    sendJson(response, 401, { ok: false, error: 'Unauthorized' })
    return
  }

  try {
    const subscriptions = await supabaseFetch<PushSubscriptionRow[]>('push_subscriptions?select=*&is_active=eq.true', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    let scheduled = 0
    let refreshed = 0
    let failed = 0

    for (const subscription of subscriptions ?? []) {
      try {
        scheduled += await generateScheduleForSub(subscription)
        refreshed += 1
      } catch (error) {
        failed += 1
        console.error('generateScheduleForSub failed:', subscription.id, error)
      }
    }

    sendJson(response, 200, { ok: true, refreshed, scheduled, failed })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
