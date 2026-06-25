import { useMemo, useState } from 'react'
import {
  getStoredWebPushSubscription,
  getWebPushAvailability,
  sendTestWebPush,
  syncAllNoteWebPush,
  subscribeWebPush,
} from '@/notifications/webPushClient'
import type { StoredWebPushSubscription } from '@/notifications/webPushClient'

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

  return (
    <section className="mt-5 rounded-[16px] bg-[var(--color-card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-[var(--color-text-secondary)]">
            Thông báo
          </p>
          <h2 className="mt-1 text-[17px] font-semibold text-[var(--color-text)]">Web Push MVP</h2>
        </div>
        <span className="rounded-full bg-[var(--color-green-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-green-text)]">
          Test
        </span>
      </div>

      {availability.reason ? (
        <p className="mt-3 text-[14px] leading-5 text-[var(--color-text-secondary)]">{availability.reason}</p>
      ) : (
        <p className="mt-3 text-[14px] leading-5 text-[var(--color-text-secondary)]">
          Bật nhắc mùng 1 và rằm trước 2 ngày lúc 07:00. Bạn cũng có thể gửi thử một thông báo ngay.
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="min-h-11 rounded-full bg-[var(--color-red)] px-4 text-[15px] font-semibold text-white disabled:opacity-45"
          disabled={!availability.supported || isBusy}
          onClick={() => void enableNotifications()}
        >
          {subscription ? 'Cập nhật nhắc lịch' : 'Bật thông báo'}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full bg-[var(--color-bg-grouped)] px-4 text-[15px] font-semibold text-[var(--color-red)] disabled:opacity-45"
          disabled={!subscription || isBusy}
          onClick={() => void sendTestNotification()}
        >
          Gửi thử ngay
        </button>
      </div>

      {status ? <p className="mt-3 text-[13px] leading-5 text-[var(--color-text-secondary)]">{status}</p> : null}
    </section>
  )
}
