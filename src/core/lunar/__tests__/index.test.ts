import { describe, expect, it } from 'vitest'
import { getDayInfo } from '../index'

const zonedDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00+07:00`)

describe('getDayInfo integration API', () => {
  it.each([
    ['2020-01-25', { day: 1, month: 1, year: 2020, isLeapMonth: false }, true, false],
    ['2023-01-22', { day: 1, month: 1, year: 2023, isLeapMonth: false }, true, false],
    ['2024-02-10', { day: 1, month: 1, year: 2024, isLeapMonth: false }, true, false],
    ['2025-01-29', { day: 1, month: 1, year: 2025, isLeapMonth: false }, true, false],
    ['2024-02-24', { day: 15, month: 1, year: 2024, isLeapMonth: false }, false, true],
    ['2023-09-29', { day: 15, month: 8, year: 2023, isLeapMonth: false }, false, true],
    ['2024-09-17', { day: 15, month: 8, year: 2024, isLeapMonth: false }, false, true],
    ['2023-03-22', { day: 1, month: 2, year: 2023, isLeapMonth: true }, true, false],
    ['2020-05-23', { day: 1, month: 4, year: 2020, isLeapMonth: true }, true, false],
    ['2017-07-23', { day: 1, month: 6, year: 2017, isLeapMonth: true }, true, false],
    ['2024-02-09', { day: 30, month: 12, year: 2023, isLeapMonth: false }, false, false],
    ['2024-02-12', { day: 3, month: 1, year: 2024, isLeapMonth: false }, false, false],
    ['2024-03-10', { day: 1, month: 2, year: 2024, isLeapMonth: false }, true, false],
    ['2024-04-09', { day: 1, month: 3, year: 2024, isLeapMonth: false }, true, false],
    ['2024-06-10', { day: 5, month: 5, year: 2024, isLeapMonth: false }, false, false],
    ['2024-09-03', { day: 1, month: 8, year: 2024, isLeapMonth: false }, true, false],
    ['2024-11-01', { day: 1, month: 10, year: 2024, isLeapMonth: false }, true, false],
    ['2024-12-31', { day: 1, month: 12, year: 2024, isLeapMonth: false }, true, false],
  ])('returns complete day info for %s', (isoDate, lunar, isMung1, isRam) => {
    const info = getDayInfo(zonedDate(isoDate))

    expect(info.solar).toMatchObject({
      day: Number(isoDate.slice(8, 10)),
      month: Number(isoDate.slice(5, 7)),
      year: Number(isoDate.slice(0, 4)),
    })
    expect(info.solar.weekday.length).toBeGreaterThan(0)
    expect(info.lunar).toEqual(lunar)
    expect(info.isMung1).toBe(isMung1)
    expect(info.isRam).toBe(isRam)
    expect(info.canChi.year.length).toBeGreaterThan(0)
    expect(info.canChi.month.length).toBeGreaterThan(0)
    expect(info.canChi.day.length).toBeGreaterThan(0)
    expect(info.gioHoangDao).toHaveLength(6)
    expect(typeof info.gioHoangDao[0].name).toBe('string')
    expect(typeof info.gioHoangDao[0].chi).toBe('string')
    expect(info.gioHoangDao[0].range).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
    expect(info.truc.length).toBeGreaterThan(0)
    expect(info.sao.name.length).toBeGreaterThan(0)
    expect(info.sao.nguHanh.length).toBeGreaterThan(0)
    expect(info.tietKhi.length).toBeGreaterThan(0)
  })

  it('returns known details for Tet 2024 in Viet Nam timezone UTC+7', () => {
    const info = getDayInfo(zonedDate('2024-02-10'), { timeZone: 7 })

    expect(info).toMatchObject({
      solar: { day: 10, month: 2, year: 2024, weekday: 'Thứ bảy' },
      lunar: { day: 1, month: 1, year: 2024, isLeapMonth: false },
      canChi: { year: 'Giáp Thìn', month: 'Bính Dần', day: 'Giáp Thìn' },
      truc: 'Mãn',
      sao: { name: 'Nữ', nguHanh: 'Thổ' },
      tietKhi: 'Lập xuân',
      isMung1: true,
      isRam: false,
    })
    expect(info.gioHoangDao.map((hour) => hour.chi)).toEqual([
      'Dần',
      'Thìn',
      'Tỵ',
      'Thân',
      'Dậu',
      'Hợi',
    ])
  })

  it('defaults timezone to UTC+7 and respects explicit timezone option', () => {
    const instant = new Date('2024-02-09T18:00:00.000Z')

    expect(getDayInfo(instant)).toEqual(getDayInfo(instant, { timeZone: 7 }))
    expect(getDayInfo(instant, { timeZone: 7 }).solar).toMatchObject({
      day: 10,
      month: 2,
      year: 2024,
    })
    expect(getDayInfo(instant, { timeZone: 0 }).solar).toMatchObject({
      day: 9,
      month: 2,
      year: 2024,
    })
  })
})
