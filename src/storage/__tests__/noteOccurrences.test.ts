import { describe, expect, it } from 'vitest'
import { getMonthDays } from '@/modules/calendar/calendarMath'
import { buildNoteOccurrenceMap } from '../noteOccurrences'
import type { CalendarNote } from '../types'

const baseNote = {
  note: '',
  repeatType: 'none',
  reminder: { enabled: false, daysBefore: 0, time: '08:00' },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
} satisfies Pick<
  CalendarNote,
  'note' | 'repeatType' | 'reminder' | 'createdAt' | 'updatedAt'
>

describe('note occurrence mapping', () => {
  it('maps direct solar notes to their saved date', () => {
    const days = getMonthDays(2024, 2)
    const map = buildNoteOccurrenceMap(days, [
      {
        ...baseNote,
        id: 'solar-note',
        title: 'Solar note',
        solarDate: '2024-02-10',
        repeatType: 'none',
      },
    ])

    expect(map['2024-02-10']).toHaveLength(1)
    expect(map['2024-02-10'][0]).toMatchObject({
      dateKey: '2024-02-10',
      isRepeat: false,
    })
  })

  it('maps yearly lunar notes onto matching lunar date in the visible month', () => {
    const days = getMonthDays(2025, 1)
    const map = buildNoteOccurrenceMap(days, [
      {
        ...baseNote,
        id: 'lunar-repeat',
        title: 'Gio',
        solarDate: '2024-02-10',
        lunarDate: { day: 1, month: 1, isLeapMonth: false },
        repeatType: 'yearly_lunar',
      },
    ])

    expect(map['2025-01-29']).toHaveLength(1)
    expect(map['2025-01-29'][0]).toMatchObject({
      dateKey: '2025-01-29',
      isRepeat: true,
    })
  })
})
