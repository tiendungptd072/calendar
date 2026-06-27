import type { CalendarDay } from '@/modules/calendar/calendarMath'
import type { CalendarNote } from './types'

export interface NoteOccurrence {
  note: CalendarNote
  dateKey: string
  isRepeat: boolean
}

export type NoteOccurrenceMap = Record<string, NoteOccurrence[]>

export const getNotesForDay = (
  day: CalendarDay,
  notesByDate: NoteOccurrenceMap,
): NoteOccurrence[] => notesByDate[day.key] ?? []

export function buildNoteOccurrenceMap(days: CalendarDay[], notes: CalendarNote[]): NoteOccurrenceMap {
  return days.reduce<NoteOccurrenceMap>((acc, day) => {
    const occurrences = notes.filter((note) => {
      if (note.solarDate === day.key) {
        return true
      }

      if (note.repeatType === 'yearly_lunar' && note.lunarDate) {
        return (
          note.lunarDate.day === day.info.lunar.day &&
          note.lunarDate.month === day.info.lunar.month &&
          note.lunarDate.isLeapMonth === day.info.lunar.isLeapMonth
        )
      }

      if (note.repeatType === 'yearly_solar') {
        const [, noteMonth, noteDay] = note.solarDate.split('-').map(Number)
        return noteMonth === day.info.solar.month && noteDay === day.info.solar.day
      }

      return false
    })

    if (occurrences.length > 0) {
      acc[day.key] = occurrences.map((note) => ({
        note,
        dateKey: day.key,
        isRepeat: note.solarDate !== day.key,
      }))
    }

    return acc
  }, {})
}
