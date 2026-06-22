import type { ReactNode } from 'react'

type TabId = 'calendar' | 'notes' | 'search' | 'settings'

const tabs: Array<{ id: TabId; label: string; icon: (active: boolean) => ReactNode }> = [
  {
    id: 'calendar',
    label: 'Lịch',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="16" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 9h17M8 2.5v3M16 2.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {active ? <circle cx="12" cy="15" r="2.2" fill="currentColor" /> : null}
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Ghi chú',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="3.5" width="16" height="17" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Tra cứu',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Cài đặt',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export function BottomTabBar() {
  return (
    <nav className="flex border-t border-[var(--color-separator)] bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] pb-[calc(9px+env(safe-area-inset-bottom))] pt-[9px]">
      {tabs.map((tab) => {
        const active = tab.id === 'calendar'

        return (
          <button
            type="button"
            key={tab.id}
            className={[
              'flex min-h-11 flex-1 flex-col items-center justify-center gap-1',
              active ? 'font-semibold text-[var(--color-red)]' : 'font-medium text-[var(--color-text-secondary)]',
            ].join(' ')}
          >
            {tab.icon(active)}
            <span className="text-[10.5px]">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
