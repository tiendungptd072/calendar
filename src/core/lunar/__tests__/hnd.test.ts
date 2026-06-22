import { describe, expect, it } from 'vitest'
import { convertLunar2Solar, convertSolar2Lunar, jdFromDate, jdToDate } from '../hnd'
import type { LunarDate, SolarDate } from '../hnd'

// Expected dates are based on Ho Ngoc Duc's Vietnamese lunar calendar tables/algorithm.
// These tests intentionally use timeZone = 7 to lock Vietnamese lunar conversion to UTC+7.
describe('Ho Ngoc Duc Vietnamese lunar conversion', () => {
  it('round-trips Julian day conversion', () => {
    const jd = jdFromDate(10, 2, 2024)

    expect(jd).toBe(2460351)
    expect(jdToDate(jd)).toEqual({ day: 10, month: 2, year: 2024 })
  })

  const tetCases: Array<[SolarDate, LunarDate]> = [
    [{ day: 25, month: 1, year: 2020 }, { day: 1, month: 1, year: 2020, leap: 0 }],
    [{ day: 23, month: 1, year: 2012 }, { day: 1, month: 1, year: 2012, leap: 0 }],
    [{ day: 22, month: 1, year: 2023 }, { day: 1, month: 1, year: 2023, leap: 0 }],
    [{ day: 10, month: 2, year: 2024 }, { day: 1, month: 1, year: 2024, leap: 0 }],
    [{ day: 29, month: 1, year: 2025 }, { day: 1, month: 1, year: 2025, leap: 0 }],
  ]

  it.each(tetCases)('converts Tet Nguyen Dan solar date $0 to lunar new year $1', (solar, lunar) => {
    expect(convertSolar2Lunar(solar.day, solar.month, solar.year, 7)).toEqual(lunar)
    expect(convertLunar2Solar(lunar.day, lunar.month, lunar.year, lunar.leap, 7)).toEqual(solar)
  })

  const fullMoonCases: Array<[SolarDate, LunarDate]> = [
    [{ day: 24, month: 2, year: 2024 }, { day: 15, month: 1, year: 2024, leap: 0 }],
    [{ day: 17, month: 9, year: 2024 }, { day: 15, month: 8, year: 2024, leap: 0 }],
    [{ day: 29, month: 9, year: 2023 }, { day: 15, month: 8, year: 2023, leap: 0 }],
  ]

  it.each(fullMoonCases)('converts known full moon date $0 to lunar date $1', (solar, lunar) => {
    expect(convertSolar2Lunar(solar.day, solar.month, solar.year, 7)).toEqual(lunar)
    expect(convertLunar2Solar(lunar.day, lunar.month, lunar.year, lunar.leap, 7)).toEqual(solar)
  })

  const leapMonthCases: Array<[SolarDate, LunarDate]> = [
    [{ day: 22, month: 3, year: 2023 }, { day: 1, month: 2, year: 2023, leap: 1 }],
    [{ day: 23, month: 5, year: 2020 }, { day: 1, month: 4, year: 2020, leap: 1 }],
    [{ day: 23, month: 7, year: 2017 }, { day: 1, month: 6, year: 2017, leap: 1 }],
  ]

  it.each(leapMonthCases)('supports Vietnamese lunar leap months $0 -> $1', (solar, lunar) => {
    expect(convertSolar2Lunar(solar.day, solar.month, solar.year, 7)).toEqual(lunar)
    expect(convertLunar2Solar(lunar.day, lunar.month, lunar.year, lunar.leap, 7)).toEqual(solar)
  })

  it('defaults conversion timezone to Viet Nam UTC+7', () => {
    expect(convertSolar2Lunar(10, 2, 2024)).toEqual(convertSolar2Lunar(10, 2, 2024, 7))
    expect(convertLunar2Solar(1, 1, 2024, 0)).toEqual(convertLunar2Solar(1, 1, 2024, 0, 7))
  })

  it('keeps timezone visible in calculations near a new moon boundary', () => {
    expect(convertSolar2Lunar(22, 3, 2023, 7)).toEqual({
      day: 1,
      month: 2,
      year: 2023,
      leap: 1,
    })
  })
})
