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
    if (!subscription) return

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
    if (!subscription) return

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
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-[var(--color-text)]">Thông báo</h2>
          <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--color-text-secondary)]">
            Nhắc mùng 1, rằm và ghi chú có bật nhắc.
          </p>
        </div>
        <span
          className={[
            'mt-0.5 shrink-0 rounded-full px-2.5 py-[3px] text-[12px] font-semibold',
            subscription
              ? 'bg-[var(--color-green-bg)] text-[var(--color-green-text)]'
              : 'bg-[var(--color-bg-grouped)] text-[var(--color-text-secondary)]',
          ].join(' ')}
        >
          {subscription ? 'Đã bật' : 'Chưa bật'}
        </span>
      </div>

      {/* Unavailability reason */}
      {availability.reason ? (
        <p className="mx-4 mb-3 rounded-[12px] bg-[rgba(255,59,48,0.1)] px-3 py-2 text-[13px] leading-5 text-[var(--color-red)]">
          {availability.reason}
        </p>
      ) : null}

      {/* Primary actions */}
      <div className="border-t border-[var(--color-separator)]">
        {!subscription ? (
          /* Not subscribed: single prominent CTA */
          <button
            type="button"
            className="w-full px-4 py-3.5 text-left text-[16px] font-semibold text-[var(--color-red)] disabled:opacity-45"
            disabled={!availability.supported || isBusy}
            onClick={() => void enableNotifications()}
          >
            {isBusy ? 'Đang bật…' : 'Bật thông báo'}
          </button>
        ) : (
          /* Subscribed: two equal actions */
          <div className="grid grid-cols-2 gap-px bg-[var(--color-separator)]">
            <button
              type="button"
              className="bg-[var(--color-card)] px-4 py-3.5 text-[15px] font-semibold text-[var(--color-red)] disabled:opacity-45"
              disabled={isBusy}
              onClick={() => void enableNotifications()}
            >
              {isBusy ? 'Đang cập nhật…' : 'Cập nhật nhắc'}
            </button>
            <button
              type="button"
              className="bg-[var(--color-card)] px-4 py-3.5 text-[15px] font-semibold text-[var(--color-red)] disabled:opacity-45"
              disabled={isBusy}
              onClick={() => void sendTestNotification()}
            >
              Gửi thử ngay
            </button>
          </div>
        )}
      </div>

      {/* Status message */}
      {status ? (
        <p className="border-t border-[var(--color-separator)] px-4 py-3 text-[13px] leading-5 text-[var(--color-text-secondary)]">
          {status}
        </p>
      ) : null}

      {/* Debug: check schedule — subtle, secondary */}
      {subscription ? (
        <div className="border-t border-[var(--color-separator)] px-4 py-2">
          <button
            type="button"
            className="text-[12px] text-[var(--color-text-secondary)] disabled:opacity-45"
            disabled={isBusy}
            onClick={() => void checkSchedule()}
          >
            Kiểm tra lịch nhắc trên server
          </button>
        </div>
      ) : null}
    </section>
  )
}
