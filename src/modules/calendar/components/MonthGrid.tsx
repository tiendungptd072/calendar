import type { NoteOccurrenceMap } from '@/storage'
import type { CalendarDay } from '../calendarMath'
import { DayCell } from './DayCell'
import { WeekdayRow } from './WeekdayRow'

interface MonthGridProps {
  days: CalendarDay[]
  selectedKey: string
  notesByDate: NoteOccurrenceMap
  onSelectDay: (day: CalendarDay) => void
}

export function MonthGrid({ days, selectedKey, notesByDate, onSelectDay }: MonthGridProps) {
  return (
    <section aria-label="Lịch tháng" className="bg-[var(--color-bg)]">
      <WeekdayRow />
      <div className="h-px scale-y-50 bg-[var(--color-separator)]" />
      <div className="grid grid-cols-7 px-3.5 pb-1 pt-0.5">
        {days.map((day) => (
          <DayCell
            key={day.key}
            day={day}
            hasNote={(notesByDate[day.key]?.length ?? 0) > 0}
            isSelected={day.key === selectedKey}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </section>
  )
}
