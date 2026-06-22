import { jdFromDate } from './hnd'

export const TIET_KHI_NAMES = [
  'Xuân phân',
  'Thanh minh',
  'Cốc vũ',
  'Lập hạ',
  'Tiểu mãn',
  'Mang chủng',
  'Hạ chí',
  'Tiểu thử',
  'Đại thử',
  'Lập thu',
  'Xử thử',
  'Bạch lộ',
  'Thu phân',
  'Hàn lộ',
  'Sương giáng',
  'Lập đông',
  'Tiểu tuyết',
  'Đại tuyết',
  'Đông chí',
  'Tiểu hàn',
  'Đại hàn',
  'Lập xuân',
  'Vũ thủy',
  'Kinh trập',
] as const

export type TietKhiName = (typeof TIET_KHI_NAMES)[number]

const PI = Math.PI

const normalizeDegrees = (value: number): number => {
  const normalized = value % 360

  return normalized < 0 ? normalized + 360 : normalized
}

const getSunLongitudeDegrees = (jdn: number, timeZone = 7): number => {
  const t = (jdn - 2451545.5 - timeZone / 24) / 36525
  const t2 = t * t
  const dr = PI / 180
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2
  const dl =
    (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * dr * m) +
    0.00029 * Math.sin(3 * dr * m)

  return normalizeDegrees(l0 + dl)
}

// Reference convention:
// Tiet khi is derived from the apparent solar longitude, split into 24 sectors of 15 degrees.
// Sector 0 starts at 0 degrees Aries (Xuân phân). This provides the current solar term label for
// the date in the selected timezone; exact transition timestamps are outside this phase.
export function getTietKhi(day: number, month: number, year: number, timeZone = 7): TietKhiName {
  const longitude = getSunLongitudeDegrees(jdFromDate(day, month, year), timeZone)
  const index = Math.floor(longitude / 15) % 24

  return TIET_KHI_NAMES[index]
}
