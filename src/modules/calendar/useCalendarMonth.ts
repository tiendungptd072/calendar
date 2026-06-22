import { useMemo, useState } from 'react'
import { addMonths, createCalendarDate, getMonthDays } from './calendarMath'
import type { CalendarDay } from './calendarMath'

interface CalendarMonthState {
  year: number
  month: number
  days: CalendarDay[]
  selectedDay: CalendarDay
  direction: number
  goToday: () => void
  goMonth: (delta: number) => void
  selectDay: (day: CalendarDay) => void
  setMonthYear: (month: number, year: number) => void
}

const getTodayParts = (): { year: number; month: number; day: number } => {
  const now = new Date()
  const vietnamNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)

  return {
    year: vietnamNow.getUTCFullYear(),
    month: vietnamNow.getUTCMonth() + 1,
    day: vietnamNow.getUTCDate(),
  }
}

export function useCalendarMonth(): CalendarMonthState {
  const today = useMemo(() => getTodayParts(), [])
  const [visibleMonth, setVisibleMonth] = useState({ year: today.year, month: today.month })
  const [selectedDate, setSelectedDate] = useState(() =>
    createCalendarDate(today.year, today.month, today.day),
  )
  const [direction, setDirection] = useState(0)
  const days = useMemo(
    () => getMonthDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth.month, visibleMonth.year],
  )
  const selectedKey = selectedDate.toISOString().slice(0, 10)
  const selectedDay =
    days.find((day) => day.key === selectedKey) ??
    days.find((day) => day.isCurrentMonth) ??
    days[0]

  const setVisibleWithDirection = (next: { year: number; month: number }, nextDirection: number) => {
    setDirection(nextDirection)
    setVisibleMonth(next)
  }

  return {
    ...visibleMonth,
    days,
    selectedDay,
    direction,
    goToday: () => {
      const nextToday = getTodayParts()
      setDirection(0)
      setVisibleMonth({ year: nextToday.year, month: nextToday.month })
      setSelectedDate(createCalendarDate(nextToday.year, nextToday.month, nextToday.day))
    },
    goMonth: (delta: number) => {
      setVisibleWithDirection(addMonths(visibleMonth, delta), delta)
    },
    selectDay: (day: CalendarDay) => {
      setSelectedDate(day.date)
      if (!day.isCurrentMonth) {
        const delta =
          day.year > visibleMonth.year || (day.year === visibleMonth.year && day.month > visibleMonth.month)
            ? 1
            : -1
        setVisibleWithDirection({ year: day.year, month: day.month }, delta)
      }
    },
    setMonthYear: (month: number, year: number) => {
      const delta = year * 12 + month - (visibleMonth.year * 12 + visibleMonth.month)
      setVisibleWithDirection({ year, month }, delta)
    },
  }
}
