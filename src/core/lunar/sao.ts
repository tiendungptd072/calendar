import { jdFromDate } from './hnd'

export const NHI_THAP_BAT_TU = [
  { name: 'Giác', fullName: 'Giác Mộc Giao', thatDieu: 'Mộc', nguHanh: 'Mộc' },
  { name: 'Cang', fullName: 'Cang Kim Long', thatDieu: 'Kim', nguHanh: 'Kim' },
  { name: 'Đê', fullName: 'Đê Thổ Lạc', thatDieu: 'Thổ', nguHanh: 'Thổ' },
  { name: 'Phòng', fullName: 'Phòng Nhật Thố', thatDieu: 'Nhật' },
  { name: 'Tâm', fullName: 'Tâm Nguyệt Hồ', thatDieu: 'Nguyệt' },
  { name: 'Vĩ', fullName: 'Vĩ Hỏa Hổ', thatDieu: 'Hỏa', nguHanh: 'Hỏa' },
  { name: 'Cơ', fullName: 'Cơ Thủy Báo', thatDieu: 'Thủy', nguHanh: 'Thủy' },
  { name: 'Đẩu', fullName: 'Đẩu Mộc Giải', thatDieu: 'Mộc', nguHanh: 'Mộc' },
  { name: 'Ngưu', fullName: 'Ngưu Kim Ngưu', thatDieu: 'Kim', nguHanh: 'Kim' },
  { name: 'Nữ', fullName: 'Nữ Thổ Bức', thatDieu: 'Thổ', nguHanh: 'Thổ' },
  { name: 'Hư', fullName: 'Hư Nhật Thử', thatDieu: 'Nhật' },
  { name: 'Nguy', fullName: 'Nguy Nguyệt Yến', thatDieu: 'Nguyệt' },
  { name: 'Thất', fullName: 'Thất Hỏa Trư', thatDieu: 'Hỏa', nguHanh: 'Hỏa' },
  { name: 'Bích', fullName: 'Bích Thủy Du', thatDieu: 'Thủy', nguHanh: 'Thủy' },
  { name: 'Khuê', fullName: 'Khuê Mộc Lang', thatDieu: 'Mộc', nguHanh: 'Mộc' },
  { name: 'Lâu', fullName: 'Lâu Kim Cẩu', thatDieu: 'Kim', nguHanh: 'Kim' },
  { name: 'Vị', fullName: 'Vị Thổ Trĩ', thatDieu: 'Thổ', nguHanh: 'Thổ' },
  { name: 'Mão', fullName: 'Mão Nhật Kê', thatDieu: 'Nhật' },
  { name: 'Tất', fullName: 'Tất Nguyệt Ô', thatDieu: 'Nguyệt' },
  { name: 'Chủy', fullName: 'Chủy Hỏa Hầu', thatDieu: 'Hỏa', nguHanh: 'Hỏa' },
  { name: 'Sâm', fullName: 'Sâm Thủy Viên', thatDieu: 'Thủy', nguHanh: 'Thủy' },
  { name: 'Tỉnh', fullName: 'Tỉnh Mộc Hãn', thatDieu: 'Mộc', nguHanh: 'Mộc' },
  { name: 'Quỷ', fullName: 'Quỷ Kim Dương', thatDieu: 'Kim', nguHanh: 'Kim' },
  { name: 'Liễu', fullName: 'Liễu Thổ Chương', thatDieu: 'Thổ', nguHanh: 'Thổ' },
  { name: 'Tinh', fullName: 'Tinh Nhật Mã', thatDieu: 'Nhật' },
  { name: 'Trương', fullName: 'Trương Nguyệt Lộc', thatDieu: 'Nguyệt' },
  { name: 'Dực', fullName: 'Dực Hỏa Xà', thatDieu: 'Hỏa', nguHanh: 'Hỏa' },
  { name: 'Chẩn', fullName: 'Chẩn Thủy Dẫn', thatDieu: 'Thủy', nguHanh: 'Thủy' },
] as const

export type NguHanh = 'Mộc' | 'Hỏa' | 'Thổ' | 'Kim' | 'Thủy'
export type ThatDieu = NguHanh | 'Nhật' | 'Nguyệt'
export type NhiThapBatTuName = (typeof NHI_THAP_BAT_TU)[number]['name']

export interface NhiThapBatTuInfo {
  index: number
  name: NhiThapBatTuName
  fullName: string
  thatDieu: ThatDieu
  nguHanh?: NguHanh
}

const REFERENCE_JD = jdFromDate(10, 2, 2024)
const REFERENCE_STAR_INDEX = 9

// Reference convention for Phase 1C:
// Vietnamese almanac / Ngoc Hap Thong Thu-style 28 mansions use the traditional
// Vietnamese/Chinese order from Giác through Chẩn.
// The daily star advances one step per solar day. The fixed project anchor is
// 2024-02-10 (Julian day 2460351) = Nữ Thổ Bức, then the cycle continues modulo 28.
// The "thatDieu" labels include Mộc/Kim/Thổ/Nhật/Nguyệt/Hỏa/Thủy; "nguHanh" is only set
// for the five elements. This is a reference convention for this app, not an absolute standard.
export function getNhiThapBatTu(day: number, month: number, year: number): NhiThapBatTuInfo {
  const jd = jdFromDate(day, month, year)
  const index = (REFERENCE_STAR_INDEX + ((jd - REFERENCE_JD) % 28) + 28) % 28
  const star = NHI_THAP_BAT_TU[index]

  return {
    index,
    name: star.name,
    fullName: star.fullName,
    thatDieu: star.thatDieu,
    nguHanh: 'nguHanh' in star ? star.nguHanh : undefined,
  }
}
