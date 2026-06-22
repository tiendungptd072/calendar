import { jdFromDate } from './hnd'
import { EARTHLY_BRANCHES } from './truc'
import type { EarthlyBranch } from './truc'

export interface GioHoangDaoInfo {
  name: string
  chi: EarthlyBranch
  range: string
}

const HOUR_RANGES = [
  '23:00-00:59',
  '01:00-02:59',
  '03:00-04:59',
  '05:00-06:59',
  '07:00-08:59',
  '09:00-10:59',
  '11:00-12:59',
  '13:00-14:59',
  '15:00-16:59',
  '17:00-18:59',
  '19:00-20:59',
  '21:00-22:59',
] as const

const HOANG_DAO_NAMES = [
  'Thanh Long',
  'Minh Đường',
  'Kim Quỹ',
  'Kim Đường',
  'Ngọc Đường',
  'Tư Mệnh',
] as const

const GOOD_HOUR_BRANCHES_BY_DAY_BRANCH: Record<EarthlyBranch, readonly EarthlyBranch[]> = {
  Tý: ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
  Sửu: ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
  Dần: ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
  Mão: ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'],
  Thìn: ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
  Tỵ: ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'],
  Ngọ: ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
  Mùi: ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
  Thân: ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
  Dậu: ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'],
  Tuất: ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
  Hợi: ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'],
}

const getDayBranch = (day: number, month: number, year: number): EarthlyBranch =>
  EARTHLY_BRANCHES[(jdFromDate(day, month, year) + 1) % 12]

// Reference convention:
// Good hours follow the common Vietnamese almanac 6-good-hours table by earthly branch of the day.
// The auspicious names are attached in a stable sequence for display. Almanac sources may attach
// name labels differently; this module keeps one explicit project convention.
export function getGioHoangDao(day: number, month: number, year: number): GioHoangDaoInfo[] {
  const dayBranch = getDayBranch(day, month, year)

  return GOOD_HOUR_BRANCHES_BY_DAY_BRANCH[dayBranch].map((chi, index) => {
    const branchIndex = EARTHLY_BRANCHES.indexOf(chi)

    return {
      name: HOANG_DAO_NAMES[index],
      chi,
      range: HOUR_RANGES[branchIndex],
    }
  })
}
