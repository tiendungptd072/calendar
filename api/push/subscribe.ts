import {
  extractReminderPreferences,
  extractSubscriptionMetadata,
  extractSubscription,
  getErrorMessage,
  readJsonBody,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_shared'
import { generateScheduleForSub } from './_schedule'
import { upsertPushSubscription } from './_supabase'

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(request)
    const subscription = extractSubscription(body)

    if (!subscription) {
      sendJson(response, 400, { ok: false, error: 'Missing or invalid push subscription' })
      return
    }

    const metadata = extractSubscriptionMetadata(body)
    const preferences = extractReminderPreferences(body)
    const row = await upsertPushSubscription({
      subscription,
      timezone: metadata.timezone,
      userAgent: metadata.userAgent,
      platform: metadata.platform,
      preferences,
    })
    const scheduled = await generateScheduleForSub(row)

    sendJson(response, 200, {
      ok: true,
      subscription_id: row.id,
      endpoint: row.endpoint,
      scheduled,
      stored: 'supabase',
    })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
