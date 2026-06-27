import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  loadNotificationSettings,
  rescheduleNotifications,
  shouldUseNotifications,
} from '@/notifications'
import { removeNoteWebPush, syncNoteWebPush } from '@/notifications/webPushClient'
import {
  buildNoteOccurrenceMap,
  createNote,
  deleteNote,
  listNotesBySolarDates,
  listYearlyLunarNotes,
  listYearlySolarNotes,
  updateNote,
} from '@/storage'
import type { CalendarNote, NoteInput, NoteOccurrenceMap } from '@/storage'
import type { NoteWebPushSyncResult } from '@/notifications/webPushClient'
import type { CalendarDay } from './calendarMath'

export interface SaveNoteResult {
  pushWarning?: string
}

interface CalendarNotesState {
  notesByDate: NoteOccurrenceMap
  saveNote: (input: NoteInput, id?: string) => Promise<SaveNoteResult>
  removeNote: (id: string) => Promise<void>
}

const getWebPushWarning = (result: NoteWebPushSyncResult): string | undefined => {
  if (result.status === 'missing_subscription') {
    return 'Ghi chú đã lưu, nhưng chưa có Web Push subscription. Hãy bấm Bật thông báo rồi cập nhật nhắc lịch.'
  }

  if (result.status === 'no_future_events') {
    return 'Ghi chú đã lưu, nhưng giờ nhắc không còn ở tương lai nên chưa tạo lịch push.'
  }

  if (result.status === 'scheduled' && result.count === 0) {
    return 'Ghi chú đã lưu, nhưng server chưa trả về lịch nhắc đã tạo.'
  }

  return undefined
}

export function useCalendarNotes(days: CalendarDay[]): CalendarNotesState {
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const solarDates = useMemo(() => days.map((day) => day.key), [days])

  const deleteExpiredOneTimeNotes = useCallback(async (): Promise<void> => {
    const { listNotes: listAllNotes } = await import('@/storage')
    const allNotes = await listAllNotes()
    const now = Date.now()

    for (const note of allNotes) {
      if (note.repeatType !== 'none' || !note.reminder.enabled) {
        continue
      }

      const [noteYear, noteMonth, noteDay] = note.solarDate.split('-').map(Number)
      const fireDate = new Date(note.solarDate)
      fireDate.setFullYear(noteYear, noteMonth - 1, noteDay - note.reminder.daysBefore)
      const [hours, minutes] = note.reminder.time.split(':').map(Number)
      fireDate.setHours(hours, minutes, 0, 0)

      if (fireDate.getTime() < now) {
        await deleteNote(note.id)
        await removeNoteWebPush(note.id).catch(() => undefined)
      }
    }
  }, [])

  // Load direct solar notes for the visible grid plus all yearly-lunar and yearly-solar notes.
  // Repeat matching is resolved in-memory against each rendered CalendarDay.
  const reload = useCallback(async () => {
    const [datedNotes, lunarNotes, solarNotes] = await Promise.all([
      listNotesBySolarDates(solarDates),
      listYearlyLunarNotes(),
      listYearlySolarNotes(),
    ])
    const byId = new Map<string, CalendarNote>()

    for (const note of [...datedNotes, ...lunarNotes, ...solarNotes]) {
      byId.set(note.id, note)
    }

    setNotes([...byId.values()])
  }, [solarDates])

  useEffect(() => {
    const loadNotes = async () => {
      await deleteExpiredOneTimeNotes()
      await reload()
    }

    void loadNotes()
  }, [reload, deleteExpiredOneTimeNotes])

  return {
    notesByDate: useMemo(() => buildNoteOccurrenceMap(days, notes), [days, notes]),
    saveNote: async (input, id) => {
      let savedNote: CalendarNote
      let pushWarning: string | undefined
      if (id) {
        savedNote = await updateNote(id, input)
      } else {
        savedNote = await createNote(input)
      }

      try {
        pushWarning = getWebPushWarning(await syncNoteWebPush(savedNote))
      } catch (error) {
        pushWarning =
          error instanceof Error
            ? `Ghi chú đã lưu, nhưng chưa tạo được lịch push: ${error.message}`
            : 'Ghi chú đã lưu, nhưng chưa tạo được lịch push.'
      }

      await reload()
      const settings = loadNotificationSettings()
      if (shouldUseNotifications(settings)) {
        await rescheduleNotifications(settings)
      }

      return { pushWarning }
    },
    removeNote: async (id) => {
      await deleteNote(id)
      await removeNoteWebPush(id).catch((error: unknown) => {
        console.warn('removeNoteWebPush failed:', error)
      })
      await reload()
      const settings = loadNotificationSettings()
      if (shouldUseNotifications(settings)) {
        await rescheduleNotifications(settings)
      }
    },
  }
}
