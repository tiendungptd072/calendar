export type NoteRepeatType = 'none' | 'yearly_lunar' | 'yearly_solar'

export interface StoredLunarDate {
  day: number
  month: number
  isLeapMonth: boolean
}

export interface NoteReminderConfig {
  enabled: boolean
  daysBefore: number
  time: string
}

export interface CalendarNote {
  id: string
  title: string
  note: string
  solarDate: string
  lunarDate?: StoredLunarDate
  repeatType: NoteRepeatType
  reminder: NoteReminderConfig
  createdAt: string
  updatedAt: string
}

export interface NoteInput {
  title: string
  note: string
  solarDate: string
  lunarDate?: StoredLunarDate
  repeatType: NoteRepeatType
  reminder: NoteReminderConfig
}
