const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const

export function WeekdayRow() {
  return (
    <div className="grid grid-cols-7 px-3.5 pb-2 pt-2.5">
      {WEEKDAYS.map((weekday, index) => (
        <div
          key={weekday}
          className={[
            'text-center text-[12px] font-semibold',
            index === 6 ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]',
          ].join(' ')}
        >
          {weekday}
        </div>
      ))}
    </div>
  )
}
