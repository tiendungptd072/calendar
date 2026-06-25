import { useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarHeader } from './components/CalendarHeader'
import { DayDetailHome } from './components/DayDetailHome'
import { DayDetailSheet } from './components/DayDetailSheet'
import { MonthGrid } from './components/MonthGrid'
import { TodaySummary } from './components/TodaySummary'
import { ViewModeToggle } from './components/ViewModeToggle'
import { useCalendarMonth } from './useCalendarMonth'
import { useCalendarNotes } from './useCalendarNotes'

export function CalendarPage() {
  const calendar = useCalendarMonth()
  const notes = useCalendarNotes(calendar.days)
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const selectedKey = calendar.selectedDay.key
  const todayDay = calendar.days.find((day) => day.isToday) ?? calendar.selectedDay
  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (!last) {
        return
      }

      if (Math.abs(mx) > 64 || vx > 0.45) {
        calendar.goMonth(dx < 0 ? 1 : -1)
      }
    },
    { axis: 'x', filterTaps: true },
  )

  if (viewMode === 'day') {
    return (
      <>
        <DayDetailHome
          day={calendar.selectedDay}
          notes={notes.notesByDate[calendar.selectedDay.key] ?? []}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenSheet={() => setIsSheetOpen(true)}
        />
        <DayDetailSheet
          info={calendar.selectedDay.info}
          solarDate={calendar.selectedDay.key}
          notes={notes.notesByDate[calendar.selectedDay.key] ?? []}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onSaveNote={notes.saveNote}
          onDeleteNote={notes.removeNote}
        />
      </>
    )
  }

  return (
    <main className="min-h-svh bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col overflow-hidden bg-[var(--color-bg)]">
        <CalendarHeader
          month={calendar.month}
          year={calendar.year}
          canChiYear={calendar.selectedDay.info.canChi.year}
          onPreviousMonth={() => calendar.goMonth(-1)}
          onNextMonth={() => calendar.goMonth(1)}
          onToday={calendar.goToday}
        />

        <div className="px-5 pb-4 pt-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        <div {...bind()} className="touch-pan-y select-none overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={calendar.direction}>
            <motion.div
              key={`${calendar.year}-${calendar.month}`}
              custom={calendar.direction}
              initial={{ x: calendar.direction >= 0 ? 34 : -34, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: calendar.direction >= 0 ? -34 : 34, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.9 }}
            >
              <MonthGrid
                days={calendar.days}
                selectedKey={selectedKey}
                notesByDate={notes.notesByDate}
                onSelectDay={(day) => {
                  calendar.selectDay(day)
                  setIsSheetOpen(true)
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <TodaySummary day={todayDay} notes={notes.notesByDate[todayDay.key] ?? []} />
      </div>

      <DayDetailSheet
        info={calendar.selectedDay.info}
        solarDate={calendar.selectedDay.key}
        notes={notes.notesByDate[calendar.selectedDay.key] ?? []}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSaveNote={notes.saveNote}
        onDeleteNote={notes.removeNote}
      />
    </main>
  )
}
