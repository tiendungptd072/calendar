import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  loadNotificationSettings,
  rescheduleNotifications,
  shouldUseNotifications,
} from '@/notifications'
import {
  buildNoteOccurrenceMap,
  createNote,
  deleteNote,
  listNotesBySolarDates,
  listYearlyLunarNotes,
  updateNote,
} from '@/storage'
import type { CalendarNote, NoteInput, NoteOccurrenceMap } from '@/storage'
import type { CalendarDay } from './calendarMath'

interface CalendarNotesState {
  notesByDate: NoteOccurrenceMap
  saveNote: (input: NoteInput, id?: string) => Promise<void>
  removeNote: (id: string) => Promise<void>
}

export function useCalendarNotes(days: CalendarDay[]): CalendarNotesState {
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const solarDates = useMemo(() => days.map((day) => day.key), [days])

  // Load direct solar notes for the visible grid plus all yearly-lunar notes.
  // Repeat matching is resolved in-memory against each rendered CalendarDay.
  const reload = useCallback(async () => {
    const [datedNotes, repeatingNotes] = await Promise.all([
      listNotesBySolarDates(solarDates),
      listYearlyLunarNotes(),
    ])
    const byId = new Map<string, CalendarNote>()

    for (const note of [...datedNotes, ...repeatingNotes]) {
      byId.set(note.id, note)
    }

    setNotes([...byId.values()])
  }, [solarDates])

  useEffect(() => {
    const loadNotes = async () => {
      await reload()
    }

    void loadNotes()
  }, [reload])

  return {
    notesByDate: useMemo(() => buildNoteOccurrenceMap(days, notes), [days, notes]),
    saveNote: async (input, id) => {
      if (id) {
        await updateNote(id, input)
      } else {
        await createNote(input)
      }
      await reload()
      const settings = loadNotificationSettings()
      if (shouldUseNotifications(settings)) {
        await rescheduleNotifications(settings)
      }
    },
    removeNote: async (id) => {
      await deleteNote(id)
      await reload()
      const settings = loadNotificationSettings()
      if (shouldUseNotifications(settings)) {
        await rescheduleNotifications(settings)
      }
    },
  }
}
