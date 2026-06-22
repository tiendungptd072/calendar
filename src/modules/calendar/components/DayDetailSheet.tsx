import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useDrag } from '@use-gesture/react'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import type { DayInfo } from '@/core/lunar'
import type { CalendarNote, NoteInput, NoteOccurrence } from '@/storage'
import { AlmanacInfoCard } from './AlmanacInfoCard'
import { AuspiciousHoursList } from './AuspiciousHoursList'

interface DayDetailSheetProps {
  info: DayInfo
  solarDate: string
  notes: NoteOccurrence[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveNote: (input: NoteInput, id?: string) => Promise<void>
  onDeleteNote: (id: string) => Promise<void>
}

const defaultReminder = { enabled: false, daysBefore: 0, time: '08:00' }
const clampDaysBefore = (value: number): number => Math.max(0, Math.min(30, value))

const formatSolarTitle = (info: DayInfo): string =>
  `${info.solar.day} tháng ${info.solar.month}, ${info.solar.year}`

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M1 1l11 11M12 1L1 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function DayDetailSheet({
  info,
  solarDate,
  notes,
  open,
  onOpenChange,
  onSaveNote,
  onDeleteNote,
}: DayDetailSheetProps) {
  const y = useMotionValue(0)
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [repeatType, setRepeatType] = useState<NoteInput['repeatType']>('none')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderDaysBefore, setReminderDaysBefore] = useState(defaultReminder.daysBefore)
  const [reminderTime, setReminderTime] = useState(defaultReminder.time)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const resetForm = () => {
    setEditingNote(null)
    setIsEditorOpen(false)
    setTitle('')
    setNoteText('')
    setRepeatType('none')
    setReminderEnabled(false)
    setReminderDaysBefore(defaultReminder.daysBefore)
    setReminderTime(defaultReminder.time)
  }

  const closeSheet = () => {
    resetForm()
    onOpenChange(false)
  }

  const startEdit = (calendarNote: CalendarNote) => {
    setEditingNote(calendarNote)
    setIsEditorOpen(true)
    setTitle(calendarNote.title)
    setNoteText(calendarNote.note)
    setRepeatType(calendarNote.repeatType)
    setReminderEnabled(calendarNote.reminder.enabled)
    setReminderDaysBefore(calendarNote.reminder.daysBefore)
    setReminderTime(calendarNote.reminder.time)
  }

  const submitNote = async () => {
    if (!title.trim()) {
      return
    }

    setIsSaving(true)
    try {
      await onSaveNote(
        {
          title: title.trim(),
          note: noteText.trim(),
          solarDate,
          lunarDate: {
            day: info.lunar.day,
            month: info.lunar.month,
            isLeapMonth: info.lunar.isLeapMonth,
          },
          repeatType,
          reminder: {
            enabled: reminderEnabled,
            daysBefore: reminderDaysBefore,
            time: reminderTime,
          },
        },
        editingNote?.id,
      )
      resetForm()
    } finally {
      setIsSaving(false)
    }
  }

  const bindDrag = useDrag(
    ({ last, movement: [, my], velocity: [, vy], cancel }) => {
      if (my < 0) {
        y.set(0)
        cancel()
        return
      }

      y.set(my)

      if (!last) {
        return
      }

      if (my > 120 || vy > 0.5) {
        closeSheet()
      } else {
        void animate(y, 0, { type: 'spring', stiffness: 380, damping: 38 })
      }
    },
    { axis: 'y', filterTaps: true },
  )

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeSheet())}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] dark:bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.section
                style={{ y }}
                className="fixed bottom-0 left-0 right-0 top-[138px] z-50 flex flex-col rounded-t-[16px] bg-[var(--color-sheet)] shadow-[0_-10px_40px_rgba(0,0,0,0.22)] outline-none dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              >
                <div {...bindDrag()} className="flex min-h-0 flex-1 touch-pan-x flex-col">
                  <div className="flex justify-center px-4 pb-0.5 pt-[9px]">
                    <div className="h-[5px] w-9 rounded-full bg-[var(--color-text-tertiary)]" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-2">
                  <div className="relative px-0.5 pb-0.5 pt-1.5">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="absolute right-0 top-1 grid size-[30px] place-items-center rounded-full bg-[rgba(118,118,128,0.14)] text-[var(--color-text-secondary)] dark:bg-[rgba(120,120,128,0.32)]"
                        aria-label="Đóng chi tiết ngày"
                      >
                        <CloseIcon />
                      </button>
                    </Dialog.Close>
                    <Dialog.Title className="text-[15px] font-semibold text-[var(--color-red)]">
                      {info.solar.weekday}
                    </Dialog.Title>
                    <div className="mt-px text-[30px] font-bold leading-tight tracking-[-0.6px] text-[var(--color-text)]">
                      {formatSolarTitle(info)}
                    </div>
                    <Dialog.Description className="mt-[5px] text-[15px] font-semibold text-[var(--color-red)]">
                      Ngày {info.lunar.day} tháng {info.lunar.month}
                      {info.lunar.isLeapMonth ? ' nhuận' : ''} · Năm {info.canChi.year}
                    </Dialog.Description>
                    <div className="mt-3 flex flex-wrap gap-[7px]">
                      <span className="rounded-[9px] bg-[var(--color-info-bg)] px-[11px] py-1.5 text-[12.5px] font-semibold text-[var(--color-info-text)]">
                        Tiết {info.tietKhi}
                      </span>
                      <span className="rounded-[9px] bg-[var(--color-green-bg)] px-[11px] py-1.5 text-[12.5px] font-semibold text-[var(--color-green-text)]">
                        Trực {info.truc}
                      </span>
                    </div>
                  </div>

                  <div className="mt-[18px] grid grid-cols-2 gap-2.5">
                    <AlmanacInfoCard label="Can chi ngày" value={info.canChi.day} sub="Theo chu kỳ ngày" />
                    <AlmanacInfoCard label="Can chi tháng" value={info.canChi.month} sub="Theo tháng âm" />
                    <AlmanacInfoCard
                      label="Sao · Ngũ hành"
                      value={`Sao ${info.sao.name}`}
                      sub={`${info.sao.nguHanh} · tham chiếu`}
                    />
                    <AlmanacInfoCard label="Trực" value={info.truc} sub="Quy ước lịch vạn niên" />
                  </div>

                  <SectionTitle>Giờ hoàng đạo</SectionTitle>
                  <AuspiciousHoursList hours={info.gioHoangDao} />

                  <SectionTitle>Ghi chú</SectionTitle>
                  <div className="overflow-hidden rounded-[14px] bg-[var(--color-card)]">
                    {notes.length === 0 ? (
                      <div className="px-4 py-3 text-[15px] text-[var(--color-text-secondary)]">
                        Chưa có ghi chú cho ngày này.
                      </div>
                    ) : (
                      notes.map((occurrence) => (
                        <div
                          key={`${occurrence.note.id}-${occurrence.dateKey}`}
                          className="flex items-center gap-[13px] border-b border-[var(--color-separator)] px-4 py-[13px]"
                        >
                          <span className="h-[30px] w-1 flex-none rounded-full bg-[var(--color-red)]" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[16px] text-[var(--color-text)]">
                              {occurrence.note.title}
                            </div>
                            <div className="mt-px text-[13px] text-[var(--color-text-secondary)]">
                              {occurrence.note.reminder.enabled ? occurrence.note.reminder.time : 'Cả ngày'}
                              {occurrence.note.repeatType === 'yearly_lunar' ? ' · Lặp âm lịch' : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[13px] font-semibold text-[var(--color-red)]"
                            onClick={() => startEdit(occurrence.note)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="text-[13px] font-semibold text-[var(--color-text-secondary)]"
                            onClick={() => void onDeleteNote(occurrence.note.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      ))
                    )}
                    <button
                      type="button"
                      className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-[17px] font-medium text-[var(--color-red)]"
                      onClick={() => setIsEditorOpen(true)}
                    >
                      <PlusIcon />
                      Thêm ghi chú
                    </button>
                  </div>

                  {isEditorOpen ? (
                    <div className="mt-3 rounded-[14px] bg-[var(--color-card)] p-3.5">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-[var(--color-text-secondary)]">
                        {editingNote ? 'Sửa ghi chú' : 'Ghi chú mới'}
                      </p>
                      <input
                        className="mt-3 w-full rounded-[12px] bg-[var(--color-bg-grouped)] px-3 py-2.5 text-[16px] text-[var(--color-text)] outline-none"
                        value={title}
                        placeholder="Tiêu đề"
                        onChange={(event) => setTitle(event.target.value)}
                      />
                      <textarea
                        className="mt-2 min-h-20 w-full resize-none rounded-[12px] bg-[var(--color-bg-grouped)] px-3 py-2.5 text-[16px] text-[var(--color-text)] outline-none"
                        value={noteText}
                        placeholder="Nội dung"
                        onChange={(event) => setNoteText(event.target.value)}
                      />
                      <div className="mt-3 space-y-2 text-[14px] text-[var(--color-text)]">
                        <label className="flex min-h-8 items-center justify-between gap-3">
                          Lặp hằng năm theo âm lịch
                          <input
                            type="checkbox"
                            checked={repeatType === 'yearly_lunar'}
                            onChange={(event) => setRepeatType(event.target.checked ? 'yearly_lunar' : 'none')}
                          />
                        </label>
                        <label className="flex min-h-8 items-center justify-between gap-3">
                          Nhắc ghi chú
                          <input
                            type="checkbox"
                            checked={reminderEnabled}
                            onChange={(event) => setReminderEnabled(event.target.checked)}
                          />
                        </label>
                        {reminderEnabled ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                              Trước
                              <input
                                type="number"
                                min={0}
                                max={30}
                                className="mt-1 w-full rounded-[10px] bg-[var(--color-bg-grouped)] px-3 py-2 text-[15px] text-[var(--color-text)] outline-none"
                                value={reminderDaysBefore}
                                onChange={(event) =>
                                  setReminderDaysBefore(clampDaysBefore(Number(event.target.value)))
                                }
                              />
                            </label>
                            <label className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                              Giờ
                              <input
                                type="time"
                                className="mt-1 w-full rounded-[10px] bg-[var(--color-bg-grouped)] px-3 py-2 text-[15px] text-[var(--color-text)] outline-none"
                                value={reminderTime}
                                onChange={(event) => setReminderTime(event.target.value)}
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="min-h-11 flex-1 rounded-full bg-[var(--color-red)] px-4 text-[15px] font-semibold text-white disabled:opacity-40"
                          disabled={!title.trim() || isSaving}
                          onClick={() => void submitNote()}
                        >
                          {editingNote ? 'Lưu' : 'Tạo'}
                        </button>
                        <button
                          type="button"
                          className="min-h-11 rounded-full bg-[var(--color-bg-grouped)] px-4 text-[15px] font-semibold text-[var(--color-text)]"
                          onClick={resetForm}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : null}
                  </div>
                </div>
              </motion.section>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="px-1 pb-2 pt-[22px] text-[13px] font-semibold uppercase tracking-[0.4px] text-[var(--color-text-secondary)]">
      {children}
    </div>
  )
}
