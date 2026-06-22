import { describe, expect, it } from 'vitest'
import { getTruc } from '../truc'

// Reference convention: Vietnamese almanac / Ngoc Hap Thong Thu-style rule where
// month 1 has Kiến on Dần day and month 2 has Kiến on Mão day.
// These are fixed project reference cases, not a claim of absolute almanac authority.
describe('12 truc reference convention', () => {
  it.each([
    [{ day: 10, month: 2, year: 2024 }, 'Mãn', 'Thìn', 'Dần'],
    [{ day: 11, month: 2, year: 2024 }, 'Bình', 'Tỵ', 'Dần'],
    [{ day: 22, month: 3, year: 2023 }, 'Kiến', 'Mão', 'Mão'],
    [{ day: 23, month: 5, year: 2020 }, 'Thu', 'Dần', 'Tỵ'],
  ])('maps $0 to truc %s by day/month earthly branches', (solar, name, dayBranch, monthBranch) => {
    expect(getTruc(solar.day, solar.month, solar.year, 7)).toMatchObject({
      name,
      dayBranch,
      lunarMonthBranch: monthBranch,
    })
  })

  it('defaults to Vietnamese timezone UTC+7', () => {
    expect(getTruc(10, 2, 2024)).toEqual(getTruc(10, 2, 2024, 7))
  })
})
