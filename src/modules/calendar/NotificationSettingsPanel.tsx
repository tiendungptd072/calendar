import { useState } from 'react'
import {
  isNativeNotificationAvailable,
  loadNotificationSettings,
  rescheduleNotifications,
  saveNotificationSettings,
} from '@/notifications'
import type { AppNotificationSettings, NotificationReminderConfig } from '@/notifications'

const clampDaysBefore = (value: number): number => Math.max(0, Math.min(30, value))

function ReminderRow({
  title,
  value,
  onChange,
}: {
  title: string
  value: NotificationReminderConfig
  onChange: (value: NotificationReminderConfig) => void
}) {
  return (
    <div className="rounded-[8px] bg-white p-3 shadow-sm ring-1 ring-black/5 dark:bg-zinc-950 dark:ring-white/10">
      <label className="flex items-center justify-between gap-3 text-sm font-semibold">
        {title}
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) => onChange({ ...value, enabled: event.target.checked })}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          Trước
          <input
            type="number"
            min={0}
            max={30}
            className="mt-1 w-full rounded-[8px] bg-zinc-100 px-3 py-2 text-sm text-zinc-950 outline-none dark:bg-zinc-900 dark:text-white"
            value={value.daysBefore}
            onChange={(event) => onChange({ ...value, daysBefore: clampDaysBefore(Number(event.target.value)) })}
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Giờ
          <input
            type="time"
            className="mt-1 w-full rounded-[8px] bg-zinc-100 px-3 py-2 text-sm text-zinc-950 outline-none dark:bg-zinc-900 dark:text-white"
            value={value.time}
            onChange={(event) => onChange({ ...value, time: event.target.value })}
          />
        </label>
      </div>
    </div>
  )
}

export function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<AppNotificationSettings>(() => loadNotificationSettings())
  const [status, setStatus] = useState('')

  const saveAndSchedule = async (nextSettings: AppNotificationSettings) => {
    setSettings(nextSettings)
    saveNotificationSettings(nextSettings)
    const result = await rescheduleNotifications(nextSettings, { requestPermission: true })

    if (!result.nativeAvailable) {
      setStatus('Đã lưu. Trình duyệt web không hỗ trợ Capacitor local notification.')
      return
    }

    setStatus(
      result.permissionGranted
        ? `Đã lên lịch ${result.scheduled} nhắc gần nhất.`
        : 'Chưa được cấp quyền notification.',
    )
  }

  return (
    <section className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Nhắc lịch</p>
        <span className="text-xs font-medium text-zinc-500">
          {isNativeNotificationAvailable() ? 'Native' : 'Web fallback'}
        </span>
      </div>
      <ReminderRow
        title="Mùng 1"
        value={settings.mung1}
        onChange={(mung1) => void saveAndSchedule({ ...settings, mung1 })}
      />
      <ReminderRow
        title="Rằm"
        value={settings.ram}
        onChange={(ram) => void saveAndSchedule({ ...settings, ram })}
      />
      <div className="rounded-[8px] bg-white p-3 shadow-sm ring-1 ring-black/5 dark:bg-zinc-950 dark:ring-white/10">
        <label className="flex items-center justify-between gap-3 text-sm font-semibold">
          Nhắc ghi chú
          <input
            type="checkbox"
            checked={settings.notesEnabled}
            onChange={(event) =>
              void saveAndSchedule({ ...settings, notesEnabled: event.target.checked })
            }
          />
        </label>
      </div>
      {status ? <p className="px-1 text-xs font-medium text-zinc-500">{status}</p> : null}
    </section>
  )
}
