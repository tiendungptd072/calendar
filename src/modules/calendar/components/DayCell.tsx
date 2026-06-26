import type { CalendarDay } from '../calendarMath'

interface DayCellProps {
  day: CalendarDay
  hasNote: boolean
  isSelected: boolean
  onSelect: (day: CalendarDay) => void
}

const getLunarLabel = (day: CalendarDay): string => {
  if (day.info.isMung1) {
    return `1/${day.info.lunar.month}`
  }

  if (day.info.isRam) {
    return 'Rằm'
  }

  return String(day.info.lunar.day)
}

export function DayCell({ day, hasNote, isSelected, onSelect }: DayCellProps) {
  const isSpecialLunarDay = day.info.isMung1 || day.info.isRam

  return (
    <button
      type="button"
      className="flex min-h-[54px] select-none flex-col items-center pt-[7px]"
      aria-label={`Ngày ${day.day} tháng ${day.month}`}
      onClick={() => onSelect(day)}
    >
      <span
        className={[
          'grid size-8 place-items-center rounded-full text-[19px] leading-none',
          day.isToday ? 'bg-[var(--color-red)] font-semibold text-white' : '',
          isSelected && !day.isToday ? 'bg-[rgba(255,59,48,0.1)] text-[var(--color-red)]' : '',
          !day.isToday && !isSelected && day.isCurrentMonth ? 'text-[var(--color-text)]' : '',
          !day.isCurrentMonth ? 'text-[var(--color-text-tertiary)]' : '',
        ].join(' ')}
      >
        {day.day}
      </span>
      <span
        className={[
          'mt-px text-center text-[10.5px] leading-[13px]',
          isSpecialLunarDay ? 'font-bold' : 'font-normal',
          // today's red background overrides all text colors — resolve explicitly to avoid Tailwind class conflicts
          day.isToday
            ? 'text-white/80'
            : isSpecialLunarDay
              ? 'text-[var(--color-red)]'
              : day.isCurrentMonth
                ? 'text-[var(--color-text-secondary)]'
                : 'text-[var(--color-text-tertiary)]',
        ].join(' ')}
      >
        {getLunarLabel(day)}
      </span>
      <span
        className={[
          'mt-[3px] size-[5px] rounded-full',
          hasNote ? 'bg-[var(--color-red)]' : 'bg-transparent',
        ].join(' ')}
        aria-hidden="true"
      />
    </button>
  )
}
