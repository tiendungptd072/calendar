interface CalendarHeaderProps {
  month: number
  year: number
  canChiYear: string
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

function ChevronLeftIcon() {
  return (
    <svg width="11" height="19" viewBox="0 0 11 19" fill="none" aria-hidden="true">
      <path
        d="M9 2L2 9.5 9 17"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="11" height="19" viewBox="0 0 11 19" fill="none" aria-hidden="true">
      <path
        d="M2 2l7 7.5L2 17"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CalendarHeader({
  month,
  year,
  canChiYear,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CalendarHeaderProps) {
  return (
    <header className="px-5 pb-1 pt-[calc(54px+env(safe-area-inset-top))]">
      <div className="text-[13px] font-semibold tracking-[0.2px] text-[var(--color-red)]">
        Năm {canChiYear}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-3">
        <h1 className="whitespace-nowrap text-[23px] font-bold leading-tight tracking-[-0.4px] text-[var(--color-text)]">
          Tháng {month} · {year}
        </h1>
        <div className="flex items-center gap-[22px] text-[var(--color-red)]">
          <button
            type="button"
            className="grid min-h-11 min-w-8 place-items-center"
            aria-label="Tháng trước"
            onClick={onPreviousMonth}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="grid min-h-11 min-w-8 place-items-center"
            aria-label="Tháng sau"
            onClick={onNextMonth}
          >
            <ChevronRightIcon />
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full px-1 text-[13px] font-semibold"
            onClick={onToday}
          >
            Hôm nay
          </button>
        </div>
      </div>
    </header>
  )
}
