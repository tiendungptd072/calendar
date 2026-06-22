import { getCanChi } from './canchi'
import { convertSolar2Lunar } from './hnd'
import { getGioHoangDao } from './hoangdao'
import { getNhiThapBatTu } from './sao'
import { getTietKhi } from './tietkhi'
import { getTruc } from './truc'

export interface DayInfo {
  solar: { day: number; month: number; year: number; weekday: string }
  lunar: { day: number; month: number; year: number; isLeapMonth: boolean }
  canChi: { year: string; month: string; day: string }
  gioHoangDao: { name: string; chi: string; range: string }[]
  truc: string
  sao: { name: string; nguHanh: string }
  tietKhi: string
  isMung1: boolean
  isRam: boolean
}

const WEEKDAYS = [
  'Chủ nhật',
  'Thứ hai',
  'Thứ ba',
  'Thứ tư',
  'Thứ năm',
  'Thứ sáu',
  'Thứ bảy',
] as const

const getDatePartsInTimeZone = (date: Date, timeZone: number): { day: number; month: number; year: number; weekday: string } => {
  const shiftedDate = new Date(date.getTime() + timeZone * 60 * 60 * 1000)

  return {
    day: shiftedDate.getUTCDate(),
    month: shiftedDate.getUTCMonth() + 1,
    year: shiftedDate.getUTCFullYear(),
    weekday: WEEKDAYS[shiftedDate.getUTCDay()],
  }
}

export function getDayInfo(date: Date, options: { timeZone?: number } = {}): DayInfo {
  const timeZone = options.timeZone ?? 7
  const solar = getDatePartsInTimeZone(date, timeZone)
  const lunar = convertSolar2Lunar(solar.day, solar.month, solar.year, timeZone)
  const sao = getNhiThapBatTu(solar.day, solar.month, solar.year)

  return {
    solar,
    lunar: {
      day: lunar.day,
      month: lunar.month,
      year: lunar.year,
      isLeapMonth: lunar.leap === 1,
    },
    canChi: getCanChi(solar.day, solar.month, solar.year, timeZone),
    gioHoangDao: getGioHoangDao(solar.day, solar.month, solar.year),
    truc: getTruc(solar.day, solar.month, solar.year, timeZone).name,
    sao: {
      name: sao.name,
      nguHanh: sao.nguHanh ?? sao.thatDieu,
    },
    tietKhi: getTietKhi(solar.day, solar.month, solar.year, timeZone),
    isMung1: lunar.day === 1,
    isRam: lunar.day === 15,
  }
}

export {
  convertLunar2Solar,
  convertSolar2Lunar,
  getLeapMonthOffset,
  getLunarMonth11,
  getNewMoonDay,
  getSunLongitude,
  jdFromDate,
  jdToDate,
} from './hnd'

export type { LunarDate, SolarDate } from './hnd'

export { getCanChi, HEAVENLY_STEMS } from './canchi'
export type { CanChiInfo, HeavenlyStem } from './canchi'

export { getGioHoangDao } from './hoangdao'
export type { GioHoangDaoInfo } from './hoangdao'

export { EARTHLY_BRANCHES, getTruc, TRUC_NAMES } from './truc'
export type { EarthlyBranch, TrucInfo, TrucName } from './truc'

export { getNhiThapBatTu, NHI_THAP_BAT_TU } from './sao'
export type { NguHanh, NhiThapBatTuInfo, NhiThapBatTuName, ThatDieu } from './sao'

export { getTietKhi, TIET_KHI_NAMES } from './tietkhi'
export type { TietKhiName } from './tietkhi'
