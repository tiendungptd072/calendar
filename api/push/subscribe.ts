import {
  extractSubscriptionMetadata,
  extractSubscription,
  getErrorMessage,
  readJsonBody,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_shared'
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
    const row = await upsertPushSubscription({
      subscription,
      timezone: metadata.timezone,
      userAgent: metadata.userAgent,
      platform: metadata.platform,
    })

    sendJson(response, 200, {
      ok: true,
      subscription_id: row.id,
      endpoint: row.endpoint,
      stored: 'supabase',
    })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
