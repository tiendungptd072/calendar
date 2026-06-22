import type { CalendarDay } from '../calendarMath'
import type { NoteOccurrence } from '@/storage'

interface TodaySummaryProps {
  day: CalendarDay
  notes: NoteOccurrence[]
}

export function TodaySummary({ day, notes }: TodaySummaryProps) {
  return (
    <section className="min-h-0 flex-1 overflow-auto border-t border-[var(--color-separator)] px-5 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-bold leading-tight text-[var(--color-text)]">Hôm nay</h2>
        <p className="text-right text-[13px] text-[var(--color-text-secondary)]">
          {day.info.solar.weekday}, {day.day}/{day.month} · {day.info.lunar.day}/
          {day.info.lunar.month} âm
        </p>
      </div>

      <div className="mt-3">
        {notes.length === 0 ? (
          <div className="rounded-[14px] bg-[var(--color-bg-grouped)] px-4 py-3 text-[14px] text-[var(--color-text-secondary)]">
            Chưa có ghi chú nào cho hôm nay.
          </div>
        ) : (
          notes.map((occurrence, index) => (
            <div
              key={`${occurrence.note.id}-${occurrence.dateKey}`}
              className={[
                'flex items-center gap-[13px] py-[11px]',
                index < notes.length - 1 ? 'border-b border-[var(--color-separator)]' : '',
              ].join(' ')}
            >
              <span className="h-8 w-1 flex-none rounded-full bg-[var(--color-red)]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-medium text-[var(--color-text)]">
                  {occurrence.note.title}
                </div>
                <div className="mt-px text-[13px] text-[var(--color-text-secondary)]">
                  {occurrence.note.reminder.enabled ? occurrence.note.reminder.time : 'Cả ngày'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
