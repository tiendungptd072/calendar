import Dexie, { type EntityTable } from 'dexie'
import type { CalendarNote } from './types'

class LunarCalendarDatabase extends Dexie {
  notes!: EntityTable<CalendarNote, 'id'>

  constructor() {
    super('lunar-calendar-web')
    this.version(1).stores({
      notes: '&id, solarDate, repeatType, updatedAt',
    })
  }
}

export const db = new LunarCalendarDatabase()
