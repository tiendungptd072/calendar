import { db } from './db'
import type { CalendarNote, NoteInput } from './types'

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const now = (): string => new Date().toISOString()

export async function createNote(input: NoteInput): Promise<CalendarNote> {
  const timestamp = now()
  const note: CalendarNote = {
    id: createId(),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.notes.add(note)

  return note
}

export async function updateNote(id: string, input: NoteInput): Promise<CalendarNote> {
  const existing = await db.notes.get(id)

  if (!existing) {
    throw new Error(`Note not found: ${id}`)
  }

  const updated: CalendarNote = {
    ...existing,
    ...input,
    updatedAt: now(),
  }

  await db.notes.put(updated)

  return updated
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id)
}

export async function listNotes(): Promise<CalendarNote[]> {
  return db.notes.orderBy('updatedAt').reverse().toArray()
}

export async function listNotesBySolarDates(solarDates: string[]): Promise<CalendarNote[]> {
  if (solarDates.length === 0) {
    return []
  }

  return db.notes.where('solarDate').anyOf(solarDates).toArray()
}

export async function listYearlyLunarNotes(): Promise<CalendarNote[]> {
  return db.notes.where('repeatType').equals('yearly_lunar').toArray()
}

export async function listYearlySolarNotes(): Promise<CalendarNote[]> {
  return db.notes.where('repeatType').equals('yearly_solar').toArray()
}
