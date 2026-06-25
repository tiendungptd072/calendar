interface ViewModeToggleProps {
  value: 'day' | 'month'
  onChange: (value: 'day' | 'month') => void
}

const options: Array<{ value: ViewModeToggleProps['value']; label: string }> = [
  { value: 'day', label: 'Chi tiết ngày' },
  { value: 'month', label: 'Lịch tháng' },
]

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="grid grid-cols-2 rounded-[12px] bg-[var(--color-bg-grouped)] p-1">
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            className={[
              'min-h-9 rounded-[9px] px-3 text-[15px] font-semibold transition-colors',
              active
                ? 'bg-[var(--color-card)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-secondary)]',
            ].join(' ')}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
