import type { NoteOccurrence } from '@/storage'
import type { CalendarDay } from '../calendarMath'
import { AlmanacInfoCard } from './AlmanacInfoCard'
import { AuspiciousHoursList } from './AuspiciousHoursList'
import { ViewModeToggle } from './ViewModeToggle'
import { WebPushPanel } from './WebPushPanel'

interface DayDetailHomeProps {
  day: CalendarDay
  notes: NoteOccurrence[]
  viewMode: 'day' | 'month'
  onViewModeChange: (value: 'day' | 'month') => void
  onOpenSheet: () => void
}

const formatSolarTitle = (day: CalendarDay): string =>
  `${day.info.solar.day} tháng ${day.info.solar.month}, ${day.info.solar.year}`

export function DayDetailHome({ day, notes, viewMode, onViewModeChange, onOpenSheet }: DayDetailHomeProps) {
  const info = day.info

  return (
    <main className="min-h-svh bg-[var(--color-bg-grouped)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(54px+env(safe-area-inset-top))]">
        <header>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[var(--color-red)]">{info.solar.weekday}</p>
            <h1 className="mt-px text-[34px] font-bold leading-tight text-[var(--color-text)]">
              {formatSolarTitle(day)}
            </h1>
            <p className="mt-1 text-[15px] font-semibold text-[var(--color-red)]">
              Ngày {info.lunar.day} tháng {info.lunar.month}
              {info.lunar.isLeapMonth ? ' nhuận' : ''} · Năm {info.canChi.year}
            </p>
          </div>
        </header>

        <div className="mt-5">
          <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-[9px] bg-[var(--color-info-bg)] px-[11px] py-1.5 text-[12.5px] font-semibold text-[var(--color-info-text)]">
            Tiết {info.tietKhi}
          </span>
          <span className="rounded-[9px] bg-[var(--color-green-bg)] px-[11px] py-1.5 text-[12.5px] font-semibold text-[var(--color-green-text)]">
            Trực {info.truc}
          </span>
          {info.isMung1 ? (
            <span className="rounded-[9px] bg-white px-[11px] py-1.5 text-[12.5px] font-semibold text-[var(--color-red)] dark:bg-[var(--color-card)]">
              Mùng 1
            </span>
          ) : null}
          {info.isRam ? (
            <span className="rounded-[9px] bg-white px-[11px] py-1.5 text-[12.5px] font-semibold text-[var(--color-red)] dark:bg-[var(--color-card)]">
              Rằm
            </span>
          ) : null}
        </div>

        <section className="mt-5 grid grid-cols-2 gap-2.5">
          <AlmanacInfoCard label="Can chi ngày" value={info.canChi.day} sub="Theo chu kỳ ngày" />
          <AlmanacInfoCard label="Can chi tháng" value={info.canChi.month} sub="Theo tháng âm" />
          <AlmanacInfoCard
            label="Sao · Ngũ hành"
            value={`Sao ${info.sao.name}`}
            sub={`${info.sao.nguHanh} · tham chiếu`}
          />
          <AlmanacInfoCard label="Trực" value={info.truc} sub="Quy ước lịch vạn niên" />
        </section>

        <SectionTitle>Giờ hoàng đạo</SectionTitle>
        <AuspiciousHoursList hours={info.gioHoangDao} />

        <SectionTitle>Ghi chú</SectionTitle>
        <section className="overflow-hidden rounded-[14px] bg-[var(--color-card)]">
          {notes.length === 0 ? (
            <div className="px-4 py-3 text-[15px] text-[var(--color-text-secondary)]">
              Chưa có ghi chú cho ngày này.
            </div>
          ) : (
            notes.map((occurrence) => (
              <button
                key={`${occurrence.note.id}-${occurrence.dateKey}`}
                type="button"
                className="flex w-full items-center gap-[13px] border-b border-[var(--color-separator)] px-4 py-[13px] text-left"
                onClick={onOpenSheet}
              >
                <span className="h-[30px] w-1 flex-none rounded-full bg-[var(--color-red)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] text-[var(--color-text)]">
                    {occurrence.note.title}
                  </div>
                  <div className="mt-px text-[13px] text-[var(--color-text-secondary)]">
                    {occurrence.note.reminder.enabled ? occurrence.note.reminder.time : 'Cả ngày'}
                    {occurrence.note.repeatType === 'yearly_lunar' ? ' · Lặp âm lịch' : ''}
                  </div>
                </div>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                  <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))
          )}
          <button
            type="button"
            className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-[16px] font-medium text-[var(--color-red)]"
            onClick={onOpenSheet}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Thêm ghi chú
          </button>
        </section>

        <SectionTitle>Nhắc lịch</SectionTitle>
        <WebPushPanel />
      </div>
    </main>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="px-1 pb-2 pt-[22px] text-[13px] font-semibold uppercase text-[var(--color-text-secondary)]">
      {children}
    </div>
  )
}
