import { useMemo, useState } from 'react'
import {
  getWebPushScheduleStatus,
  getStoredWebPushSubscription,
  getWebPushAvailability,
  sendTestWebPush,
  syncAllNoteWebPush,
  subscribeWebPush,
} from '@/notifications/webPushClient'
import type { StoredWebPushSubscription, WebPushScheduleStatus } from '@/notifications/webPushClient'

const formatScheduleTime = (isoDate: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(isoDate))

const summarizeScheduleStatus = (scheduleStatus: WebPushScheduleStatus): string => {
  const failedRecent = scheduleStatus.recent.find((row) => row.status === 'failed')
  const nextPending = scheduleStatus.pending[0]

  if (!scheduleStatus.subscription.isActive) {
    return 'Subscription đang inactive. Hãy bấm cập nhật nhắc lịch để đăng ký lại.'
  }

  if (scheduleStatus.dispatch.acceptedSecretEnvNames.length === 0) {
    return 'Server chưa có CRON_SECRET. Hãy thêm CRON_SECRET trên Vercel rồi redeploy.'
  }

  if (scheduleStatus.due.length > 0) {
    return `Có ${scheduleStatus.due.length} lịch đã đến hạn nhưng chưa gửi. Scheduler chưa gọi /api/dispatch hoặc đang lỗi.`
  }

  if (failedRecent) {
    return `Lịch gần nhất bị lỗi: ${failedRecent.error_message ?? 'không rõ nguyên nhân'}.`
  }

  if (nextPending) {
    return `Lịch nhắc kế tiếp trên server: ${formatScheduleTime(nextPending.fire_at)} (${nextPending.type}).`
  }

  return 'Chưa có lịch nhắc nào trên server. Hãy tạo ghi chú có bật nhắc hoặc bấm cập nhật nhắc lịch.'
}

export function WebPushPanel() {
  const availability = useMemo(() => getWebPushAvailability(), [])
  const [subscription, setSubscription] = useState<StoredWebPushSubscription | null>(() =>
    getStoredWebPushSubscription(),
  )
  const [status, setStatus] = useState(subscription ? 'Đã bật thông báo trên trình duyệt này.' : '')
  const [isBusy, setIsBusy] = useState(false)

  const enableNotifications = async () => {
    setIsBusy(true)
    setStatus('')

    try {
      const nextSubscription = await subscribeWebPush({
        leadDays: 2,
        notifyHour: 7,
        notifyMung1: true,
        notifyRam: true,
      })
      setSubscription(nextSubscription)
      const syncedNotes = await syncAllNoteWebPush()
      setStatus(`Đã bật thông báo mùng 1/rằm trước 2 ngày lúc 07:00. Đã đồng bộ ${syncedNotes} ghi chú.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không bật được thông báo.')
    } finally {
      setIsBusy(false)
    }
  }

  const sendTestNotification = async () => {
    if (!subscription) {
      setStatus('Hãy bật thông báo trước khi gửi test.')
      return
    }

    setIsBusy(true)

    try {
      const result = await sendTestWebPush(subscription)
      setStatus(result.message)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không gửi được test notification.')
    } finally {
      setIsBusy(false)
    }
  }

  const checkSchedule = async () => {
    if (!subscription) {
      setStatus('Hãy bật thông báo trước khi kiểm tra lịch nhắc.')
      return
    }

    setIsBusy(true)

    try {
      const scheduleStatus = await getWebPushScheduleStatus(subscription)
      setStatus(summarizeScheduleStatus(scheduleStatus))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không kiểm tra được lịch nhắc.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-[14px] bg-[var(--color-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 px-4 pt-3.5">
          <h2 className="text-[17px] font-semibold text-[var(--color-text)]">Thông báo</h2>
          <p className="mt-1 text-[14px] leading-5 text-[var(--color-text-secondary)]">
            Nhắc mùng 1, rằm và các ghi chú đã bật nhắc.
          </p>
        </div>
        <span
          className={[
            'mr-4 mt-3.5 shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold',
            subscription
              ? 'bg-[var(--color-green-bg)] text-[var(--color-green-text)]'
              : 'bg-[var(--color-bg-grouped)] text-[var(--color-text-secondary)]',
          ].join(' ')}
        >
          {subscription ? 'Đã bật' : 'Chưa bật'}
        </span>
      </div>

      {availability.reason ? (
        <p className="mx-4 mt-3 rounded-[12px] bg-[rgba(255,59,48,0.1)] px-3 py-2 text-[13px] leading-5 text-[var(--color-red)]">
          {availability.reason}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-px bg-[var(--color-separator)] sm:grid-cols-3">
        <button
          type="button"
          className="min-h-12 bg-[var(--color-card)] px-4 text-[15px] font-semibold text-[var(--color-red)] disabled:opacity-45"
          disabled={!availability.supported || isBusy}
          onClick={() => void enableNotifications()}
        >
          {subscription ? 'Cập nhật nhắc' : 'Bật thông báo'}
        </button>
        <button
          type="button"
          className="min-h-12 bg-[var(--color-card)] px-4 text-[15px] font-semibold text-[var(--color-red)] disabled:opacity-45"
          disabled={!subscription || isBusy}
          onClick={() => void sendTestNotification()}
        >
          Gửi thử ngay
        </button>
        <button
          type="button"
          className="min-h-12 bg-[var(--color-card)] px-4 text-[15px] font-semibold text-[var(--color-red)] disabled:opacity-45"
          disabled={!subscription || isBusy}
          onClick={() => void checkSchedule()}
        >
          Kiểm tra lịch nhắc
        </button>
      </div>

      {status ? (
        <p className="border-t border-[var(--color-separator)] px-4 py-3 text-[13px] leading-5 text-[var(--color-text-secondary)]">
          {status}
        </p>
      ) : null}
    </section>
  )
}
