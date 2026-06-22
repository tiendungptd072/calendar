export type AppModuleId = 'calendar' | 'notes' | 'almanac'

export interface AppModule {
  id: AppModuleId
  label: string
}

export const moduleRegistry: AppModule[] = [
  { id: 'calendar', label: 'Lich' },
  { id: 'notes', label: 'Ghi chu' },
  { id: 'almanac', label: 'Tien ich' },
]
