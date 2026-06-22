import { describe, expect, it } from 'vitest'
import { getNhiThapBatTu, NHI_THAP_BAT_TU } from '../sao'

// Reference convention: Vietnamese almanac / Ngoc Hap Thong Thu-style traditional
// 28-star order, one star per solar day, fixed project anchor 2024-02-10 = Nữ Thổ Bức.
// This is not an absolute standard.
describe('28 mansions reference convention', () => {
  it('contains all 28 mansions with fixed order metadata', () => {
    expect(NHI_THAP_BAT_TU).toHaveLength(28)
    expect(NHI_THAP_BAT_TU[0]).toMatchObject({
      name: 'Giác',
      fullName: 'Giác Mộc Giao',
      nguHanh: 'Mộc',
    })
    expect(NHI_THAP_BAT_TU[9]).toMatchObject({
      name: 'Nữ',
      fullName: 'Nữ Thổ Bức',
      nguHanh: 'Thổ',
    })
  })

  it.each([
    [{ day: 10, month: 2, year: 2024 }, 'Nữ', 'Nữ Thổ Bức', 'Thổ'],
    [{ day: 11, month: 2, year: 2024 }, 'Hư', 'Hư Nhật Thử', undefined],
    [{ day: 24, month: 2, year: 2024 }, 'Liễu', 'Liễu Thổ Chương', 'Thổ'],
    [{ day: 9, month: 3, year: 2024 }, 'Nữ', 'Nữ Thổ Bức', 'Thổ'],
  ])('maps $0 to fixed reference star', (solar, name, fullName, nguHanh) => {
    expect(getNhiThapBatTu(solar.day, solar.month, solar.year)).toMatchObject({
      name,
      fullName,
      nguHanh,
    })
  })
})
