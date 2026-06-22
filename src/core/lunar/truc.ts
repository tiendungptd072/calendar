import { convertSolar2Lunar, jdFromDate } from './hnd'

export const EARTHLY_BRANCHES = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
] as const

export const TRUC_NAMES = [
  'Kiến',
  'Trừ',
  'Mãn',
  'Bình',
  'Định',
  'Chấp',
  'Phá',
  'Nguy',
  'Thành',
  'Thu',
  'Khai',
  'Bế',
] as const

export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number]
export type TrucName = (typeof TRUC_NAMES)[number]

export interface TrucInfo {
  index: number
  name: TrucName
  dayBranch: EarthlyBranch
  lunarMonthBranch: EarthlyBranch
}

const getDayBranchIndex = (day: number, month: number, year: number): number =>
  (jdFromDate(day, month, year) + 1) % 12

const getLunarMonthBranchIndex = (lunarMonth: number): number => (lunarMonth + 1) % 12

// Reference convention for Phase 1C:
// Vietnamese almanac / Ngoc Hap Thong Thu-style "12 truc" is implemented as the common rule:
// month 1 (Dần month) has Kiến on Dần day, month 2 has Kiến on Mão day, and so on.
// Each following earthly-branch day advances one officer through
// Kiến, Trừ, Mãn, Bình, Định, Chấp, Phá, Nguy, Thành, Thu, Khai, Bế.
// This is a fixed project reference convention for tests, not an absolute almanac standard.
export function getTruc(day: number, month: number, year: number, timeZone = 7): TrucInfo {
  const lunarDate = convertSolar2Lunar(day, month, year, timeZone)
  const dayBranchIndex = getDayBranchIndex(day, month, year)
  const lunarMonthBranchIndex = getLunarMonthBranchIndex(lunarDate.month)
  const index = (dayBranchIndex - lunarMonthBranchIndex + 12) % 12

  return {
    index,
    name: TRUC_NAMES[index],
    dayBranch: EARTHLY_BRANCHES[dayBranchIndex],
    lunarMonthBranch: EARTHLY_BRANCHES[lunarMonthBranchIndex],
  }
}
