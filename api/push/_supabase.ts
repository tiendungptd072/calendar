import type { PushReminderPreferences, WebPushSubscriptionPayload } from './_shared.js'

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  subscription: WebPushSubscriptionPayload
  timezone: string
  lead_days: number
  notify_hour: number
  notify_mung1: boolean
  notify_ram: boolean
  is_active: boolean
}

interface SupabaseErrorPayload {
  message?: string
  details?: string
  hint?: string
  code?: string
}

export interface PushSubscriptionUpsertInput {
  subscription: WebPushSubscriptionPayload
  timezone: string
  userAgent: string
  platform: string
  preferences: PushReminderPreferences
}

const PUSH_SUBSCRIPTION_SELECT = 'id,endpoint,subscription,timezone,lead_days,notify_hour,notify_mung1,notify_ram,is_active'

const getSupabaseConfig = (): { url: string; key: string } => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY')
  }

  return {
    url: url.replace(/\/$/, ''),
    key,
  }
}

const readSupabaseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text()

  if (!response.ok) {
    let parsedBody: unknown
    try {
      parsedBody = text ? JSON.parse(text) : null
    } catch {
      parsedBody = null
    }
    const error = parsedBody as SupabaseErrorPayload | null
    throw new Error(error?.message || `Supabase request failed with status ${response.status}`)
  }

  return (text ? JSON.parse(text) : null) as T
}

export const supabaseFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { url, key } = getSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...init.headers,
    },
  })

  return readSupabaseResponse<T>(response)
}

export const upsertPushSubscription = async ({
  subscription,
  timezone,
  userAgent,
  platform,
  preferences,
}: PushSubscriptionUpsertInput): Promise<PushSubscriptionRow> => {
  const now = new Date().toISOString()
  const rows = await supabaseFetch<PushSubscriptionRow[]>('push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      subscription,
      timezone,
      user_agent: userAgent,
      platform,
      lead_days: preferences.leadDays,
      notify_hour: preferences.notifyHour,
      notify_mung1: preferences.notifyMung1,
      notify_ram: preferences.notifyRam,
      is_active: true,
      last_seen_at: now,
      updated_at: now,
    }),
  })

  const row = rows[0]
  if (!row) {
    throw new Error('Supabase did not return the upserted push subscription')
  }

  return row
}

export const findPushSubscription = async ({
  endpoint,
  subscriptionId,
}: {
  endpoint?: string
  subscriptionId?: string
}): Promise<PushSubscriptionRow | null> => {
  if (!endpoint && !subscriptionId) {
    return null
  }

  const query = new URLSearchParams({
    select: PUSH_SUBSCRIPTION_SELECT,
    limit: '1',
  })

  if (subscriptionId) {
    query.set('id', `eq.${subscriptionId}`)
  } else if (endpoint) {
    query.set('endpoint', `eq.${endpoint}`)
  }

  const rows = await supabaseFetch<PushSubscriptionRow[]>(`push_subscriptions?${query.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return rows[0] ?? null
}

export const listPushSubscriptionsByIds = async (
  subscriptionIds: string[],
): Promise<Map<string, PushSubscriptionRow>> => {
  const uniqueIds = [...new Set(subscriptionIds)].filter(Boolean)

  if (uniqueIds.length === 0) {
    return new Map()
  }

  const query = new URLSearchParams({
    select: PUSH_SUBSCRIPTION_SELECT,
    id: `in.(${uniqueIds.join(',')})`,
  })
  const rows = await supabaseFetch<PushSubscriptionRow[]>(`push_subscriptions?${query.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return new Map((rows ?? []).map((row) => [row.id, row]))
}
