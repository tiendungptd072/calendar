import {
  configureWebPush,
  extractMessagePayload,
  extractPushTestTarget,
  getErrorMessage,
  readJsonBody,
  sendJson,
  webPush,
  type ApiRequest,
  type ApiResponse,
} from './_shared'
import { findPushSubscription } from './_supabase'

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
    const target = extractPushTestTarget(body)
    const row = await findPushSubscription(target)

    if (!row) {
      sendJson(response, 400, {
        ok: false,
        error: 'Missing endpoint/subscription_id or subscription not found. Subscribe first, then send a test notification.',
      })
      return
    }

    const payload = extractMessagePayload(body)
    await webPush.sendNotification(row.subscription, JSON.stringify(payload))

    sendJson(response, 200, { ok: true, sent: true, subscription_id: row.id, endpoint: row.endpoint })
  } catch (error) {
    sendJson(response, 500, { ok: false, error: getErrorMessage(error) })
  }
}
