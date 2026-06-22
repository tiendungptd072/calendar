import { getDayInfo } from '@/core/lunar'
import type { DayInfo } from '@/core/lunar'

export interface CalendarDay {
  key: string
  date: Date
  day: number
  month: number
  year: number
  isCurrentMonth: boolean
  isToday: boolean
  info: DayInfo
}

const VIETNAM_TIMEZONE = 7

const pad = (value: number): string => String(value).padStart(2, '0')

export const toKey = (year: number, month: number, day: number): string =>
  `${year}-${pad(month)}-${pad(day)}`

export const createCalendarDate = (year: number, month: number, day: number): Date =>
  new Date(`${toKey(year, month, day)}T12:00:00+07:00`)

export const getMonthLabel = (year: number, month: number): string =>
  `Tháng ${month}, ${year}`

// Builds the visible iOS-style month grid in Viet Nam time.
// The UI starts weeks on Monday, so Sunday (JS 0) is shifted to the last column.
export const getMonthDays = (year: number, month: number): CalendarDay[] => {
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const previousMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
  const leadingDays = (firstDay.getUTCDay() + 6) % 7
  const todayInfo = getDayInfo(new Date(), { timeZone: VIETNAM_TIMEZONE })
  const todayKey = toKey(todayInfo.solar.year, todayInfo.solar.month, todayInfo.solar.day)

  return Array.from({ length: 42 }, (_, index) => {
    const offset = index - leadingDays + 1
    let cellYear = year
    let cellMonth = month
    let cellDay = offset
    let isCurrentMonth = true

    if (offset < 1) {
      isCurrentMonth = false
      cellMonth = month - 1
      cellDay = previousMonthDays + offset
      if (cellMonth < 1) {
        cellMonth = 12
        cellYear -= 1
      }
    } else if (offset > daysInMonth) {
      isCurrentMonth = false
      cellMonth = month + 1
      cellDay = offset - daysInMonth
      if (cellMonth > 12) {
        cellMonth = 1
        cellYear += 1
      }
    }

    const key = toKey(cellYear, cellMonth, cellDay)
    const date = createCalendarDate(cellYear, cellMonth, cellDay)

    return {
      key,
      date,
      day: cellDay,
      month: cellMonth,
      year: cellYear,
      isCurrentMonth,
      isToday: key === todayKey,
      info: getDayInfo(date, { timeZone: VIETNAM_TIMEZONE }),
    }
  })
}

export const addMonths = (
  value: { year: number; month: number },
  delta: number,
): { year: number; month: number } => {
  const nextDate = new Date(Date.UTC(value.year, value.month - 1 + delta, 1))

  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
  }
}
