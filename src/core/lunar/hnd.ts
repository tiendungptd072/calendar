export interface SolarDate {
  day: number
  month: number
  year: number
}

export interface LunarDate {
  day: number
  month: number
  year: number
  leap: 0 | 1
}

const PI = Math.PI

const integerPart = (value: number): number => Math.floor(value)

// Pure TypeScript port of Ho Ngoc Duc's Vietnamese lunar calendar algorithm.
// All public conversion helpers default to Viet Nam timezone UTC+7; callers may pass another
// timezone for verification, but app usage must keep timeZone = 7 for Vietnamese lunar dates.
export function jdFromDate(day: number, month: number, year: number): number {
  const a = integerPart((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  let jd =
    day +
    integerPart((153 * m + 2) / 5) +
    365 * y +
    integerPart(y / 4) -
    integerPart(y / 100) +
    integerPart(y / 400) -
    32045

  if (jd < 2299161) {
    jd =
      day +
      integerPart((153 * m + 2) / 5) +
      365 * y +
      integerPart(y / 4) -
      32083
  }

  return jd
}

export function jdToDate(jd: number): SolarDate {
  let a: number
  let b: number
  let c: number

  if (jd > 2299160) {
    a = jd + 32044
    b = integerPart((4 * a + 3) / 146097)
    c = a - integerPart((b * 146097) / 4)
  } else {
    b = 0
    c = jd + 32082
  }

  const d = integerPart((4 * c + 3) / 1461)
  const e = c - integerPart((1461 * d) / 4)
  const m = integerPart((5 * e + 2) / 153)

  return {
    day: e - integerPart((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * integerPart(m / 10),
    year: b * 100 + d - 4800 + integerPart(m / 10),
  }
}

export function getNewMoonDay(k: number, timeZone = 7): number {
  const t = k / 1236.85
  const t2 = t * t
  const t3 = t2 * t
  const dr = PI / 180
  const jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3
  const jd2 = jd1 + 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr)
  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3
  const mPrime = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3
  const correction =
    (0.1734 - 0.000393 * t) * Math.sin(m * dr) +
    0.0021 * Math.sin(2 * dr * m) -
    0.4068 * Math.sin(mPrime * dr) +
    0.0161 * Math.sin(2 * dr * mPrime) -
    0.0004 * Math.sin(3 * dr * mPrime) +
    0.0104 * Math.sin(2 * dr * f) -
    0.0051 * Math.sin((m + mPrime) * dr) -
    0.0074 * Math.sin((m - mPrime) * dr) +
    0.0004 * Math.sin((2 * f + m) * dr) -
    0.0004 * Math.sin((2 * f - m) * dr) -
    0.0006 * Math.sin((2 * f + mPrime) * dr) +
    0.001 * Math.sin((2 * f - mPrime) * dr) +
    0.0005 * Math.sin((2 * mPrime + m) * dr)
  const deltaT =
    t < -11
      ? 0.001 +
        0.000839 * t +
        0.0002261 * t2 -
        0.00000845 * t3 -
        0.000000081 * t * t3
      : -0.000278 + 0.000265 * t + 0.000262 * t2

  return integerPart(jd2 + correction - deltaT + 0.5 + timeZone / 24)
}

export function getSunLongitude(jdn: number, timeZone = 7): number {
  const t = (jdn - 2451545.5 - timeZone / 24) / 36525
  const t2 = t * t
  const dr = PI / 180
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2
  const dl =
    (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * dr * m) +
    0.00029 * Math.sin(3 * dr * m)
  let longitude = l0 + dl

  longitude *= dr
  longitude -= PI * 2 * integerPart(longitude / (PI * 2))

  return integerPart((longitude / PI) * 6)
}

export function getLunarMonth11(year: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, year) - 2415021
  const k = integerPart(off / 29.530588853)
  let nm = getNewMoonDay(k, timeZone)
  const sunLong = getSunLongitude(nm, timeZone)

  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone)
  }

  return nm
}

export function getLeapMonthOffset(a11: number, timeZone = 7): number {
  const k = integerPart((a11 - 2415021.076998695) / 29.530588853 + 0.5)
  let i = 1
  let last = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)

  while (i < 14) {
    i += 1
    const arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
    if (arc === last) {
      break
    }
    last = arc
  }

  return i - 1
}

export function convertSolar2Lunar(
  day: number,
  month: number,
  year: number,
  timeZone = 7,
): LunarDate {
  const dayNumber = jdFromDate(day, month, year)
  const k = integerPart((dayNumber - 2415021.076998695) / 29.530588853)
  let monthStart = getNewMoonDay(k + 1, timeZone)

  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone)
  }

  let a11 = getLunarMonth11(year, timeZone)
  let b11 = a11
  let lunarYear: number

  if (a11 >= monthStart) {
    lunarYear = year
    a11 = getLunarMonth11(year - 1, timeZone)
  } else {
    lunarYear = year + 1
    b11 = getLunarMonth11(year + 1, timeZone)
  }

  const lunarDay = dayNumber - monthStart + 1
  const diff = integerPart((monthStart - a11) / 29)
  let lunarLeap: 0 | 1 = 0
  let lunarMonth = diff + 11

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone)

    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10

      if (diff === leapMonthDiff) {
        lunarLeap = 1
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12
  }

  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1
  }

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
  }
}

export function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap: 0 | 1,
  timeZone = 7,
): SolarDate {
  let a11: number
  let b11: number

  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone)
    b11 = getLunarMonth11(lunarYear, timeZone)
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone)
    b11 = getLunarMonth11(lunarYear + 1, timeZone)
  }

  const k = integerPart(0.5 + (a11 - 2415021.076998695) / 29.530588853)
  let off = lunarMonth - 11

  if (off < 0) {
    off += 12
  }

  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone)
    let leapMonth = leapOff - 2

    if (leapMonth < 0) {
      leapMonth += 12
    }

    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return { day: 0, month: 0, year: 0 }
    }

    if (lunarLeap !== 0 || off >= leapOff) {
      off += 1
    }
  }

  return jdToDate(getNewMoonDay(k + off, timeZone) + lunarDay - 1)
}
