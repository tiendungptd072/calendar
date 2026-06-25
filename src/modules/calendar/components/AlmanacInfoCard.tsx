interface AlmanacInfoCardProps {
  label: string
  value: string
  sub: string
}

export function AlmanacInfoCard({ label, value, sub }: AlmanacInfoCardProps) {
  return (
    <div className="rounded-[14px] bg-[var(--color-card)] px-3.5 py-[13px]">
      <div className="text-[11.5px] font-semibold uppercase text-[var(--color-text-secondary)]">
        {label}
      </div>
      <div className="mt-[5px] text-[19px] font-semibold leading-tight text-[var(--color-text)]">
        {value}
      </div>
      <div className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">{sub}</div>
    </div>
  )
}
