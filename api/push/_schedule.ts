import { getVietnamLunarDay } from './_lunar.js'
import { supabaseFetch, type PushSubscriptionRow } from './_supabase.js'

type AlmanacPushKind = 'mung1' | 'ram'

interface AlmanacPushDate {
  date: Date
  kind: AlmanacPushKind
}

interface ScheduledPushInsert {
  subscription_id: string
  fire_at: string
  kind: AlmanacPushKind
  title: string
  body: string
  url: string
}

const VIETNAM_TIMEZONE_OFFSET = '+07:00'

const pad = (value: number): string => String(value).padStart(2, '0')

export const getUpcomingAlmanacDates = (from: Date, days: number): AlmanacPushDate[] => {
  const dates: AlmanacPushDate[] = []

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(from)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + offset)

    const lunar = getVietnamLunarDay(date)

    if (lunar.day === 1) {
      dates.push({ date: new Date(date), kind: 'mung1' })
    }

    if (lunar.day === 15) {
      dates.push({ date: new Date(date), kind: 'ram' })
    }
  }

  return dates
}

export const computeFireAt = (eventDate: Date, leadDays: number, hour: number): Date => {
  const date = new Date(eventDate)
  date.setDate(date.getDate() - leadDays)

  return new Date(
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00:00${VIETNAM_TIMEZONE_OFFSET}`,
  )
}

const shouldNotifyKind = (kind: AlmanacPushKind, subscription: PushSubscriptionRow): boolean =>
  (kind === 'mung1' && subscription.notify_mung1) || (kind === 'ram' && subscription.notify_ram)

const createScheduledPushRows = (subscription: PushSubscriptionRow, horizonDays: number): ScheduledPushInsert[] => {
  const now = Date.now()
  const leadDays = subscription.lead_days ?? 1
  const notifyHour = subscription.notify_hour ?? 7

  return getUpcomingAlmanacDates(new Date(), horizonDays)
    .filter((event) => shouldNotifyKind(event.kind, subscription))
    .map((event) => ({
      event,
      fireAt: computeFireAt(event.date, leadDays, notifyHour),
    }))
    .filter(({ fireAt }) => fireAt.getTime() > now)
    .map(({ event, fireAt }) => ({
      subscription_id: subscription.id,
      fire_at: fireAt.toISOString(),
      kind: event.kind,
      title: event.kind === 'mung1' ? 'Sắp đến mùng 1' : 'Sắp đến ngày rằm',
      body: `Còn ${leadDays} ngày`,
      url: '/',
    }))
}

export const generateScheduleForSub = async (
  subscription: PushSubscriptionRow,
  horizonDays = 90,
): Promise<number> => {
  const rows = createScheduledPushRows(subscription, horizonDays)
  const now = encodeURIComponent(new Date().toISOString())

  await supabaseFetch<null>(
    `scheduled_pushes?subscription_id=eq.${subscription.id}&sent=eq.false&fire_at=gt.${now}`,
    { method: 'DELETE' },
  )

  if (rows.length > 0) {
    await supabaseFetch<unknown>('scheduled_pushes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    })
  }

  return rows.length
}

export { supabaseFetch }
