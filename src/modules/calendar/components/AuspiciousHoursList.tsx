import type { DayInfo } from '@/core/lunar'

interface AuspiciousHoursListProps {
  hours: DayInfo['gioHoangDao']
}

const formatHourRange = (range: string): string => range.replace(':00', '').replace(':59', '')

export function AuspiciousHoursList({ hours }: AuspiciousHoursListProps) {
  return (
    <div className="rounded-[14px] bg-[var(--color-card)] p-3.5">
      <div className="grid grid-cols-2 gap-[9px]">
        {hours.map((hour) => (
          <div key={`${hour.name}-${hour.chi}`} className="rounded-[11px] bg-[var(--color-bronze-bg)] px-3 py-[9px]">
            <div className="text-[14px] font-bold leading-tight text-[var(--color-bronze-text)]">
              {hour.name}
            </div>
            <div className="mt-px text-[11.5px] text-[var(--color-bronze-sub)]">
              {hour.chi} · {formatHourRange(hour.range)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
