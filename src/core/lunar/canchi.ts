import { convertSolar2Lunar, jdFromDate } from './hnd'
import { EARTHLY_BRANCHES } from './truc'

export const HEAVENLY_STEMS = [
  'Giáp',
  'Ất',
  'Bính',
  'Đinh',
  'Mậu',
  'Kỷ',
  'Canh',
  'Tân',
  'Nhâm',
  'Quý',
] as const

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number]

export interface CanChiInfo {
  year: string
  month: string
  day: string
}

const getYearCanChi = (year: number): string =>
  `${HEAVENLY_STEMS[(year + 6) % 10]} ${EARTHLY_BRANCHES[(year + 8) % 12]}`

const getMonthCanChi = (lunarMonth: number, lunarYear: number): string => {
  const yearStemIndex = (lunarYear + 6) % 10
  const monthStemIndex = (yearStemIndex * 2 + lunarMonth + 1) % 10
  const monthBranchIndex = (lunarMonth + 1) % 12

  return `${HEAVENLY_STEMS[monthStemIndex]} ${EARTHLY_BRANCHES[monthBranchIndex]}`
}

const getDayCanChi = (day: number, month: number, year: number): string => {
  const jd = jdFromDate(day, month, year)

  return `${HEAVENLY_STEMS[(jd + 9) % 10]} ${EARTHLY_BRANCHES[(jd + 1) % 12]}`
}

// Reference convention:
// Can Chi is calculated with the common Vietnamese almanac cycle. Month Can Chi uses the lunar
// month branch sequence Dần..Sửu and the year-stem-derived month stem. Leap months reuse the same
// month Can Chi as their lunar month number. This is a practical app convention, not a claim that
// every almanac source labels all boundary cases identically.
export function getCanChi(day: number, month: number, year: number, timeZone = 7): CanChiInfo {
  const lunar = convertSolar2Lunar(day, month, year, timeZone)

  return {
    year: getYearCanChi(lunar.year),
    month: getMonthCanChi(lunar.month, lunar.year),
    day: getDayCanChi(day, month, year),
  }
}
