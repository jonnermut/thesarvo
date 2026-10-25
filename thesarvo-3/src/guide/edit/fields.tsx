import { useEffect, useId, useState } from 'react'

const INPUT =
  'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/30'

type FieldProps = { label: string; className?: string; children: (id: string) => React.ReactNode }

export function Field({ label, className = '', children }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

export function TextField({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <Field label={label} className={className}>
      {(id) => <input id={id} className={INPUT} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}

export function NumberField({ label, value, onChange, className }: { label: string; value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <Field label={label} className={className}>
      {(id) => <input id={id} type="number" className={INPUT} value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value) || 0)} />}
    </Field>
  )
}

/** Guide text stores line breaks as `<br/>`; the editor shows real newlines so they are never lost. */
const toEditable = (s: string) => s.replace(/<br\s*\/?>/gi, '\n')
const fromEditable = (s: string) => s.replace(/\r?\n/g, '<br/>')

export function AreaField({ label, value, onChange, rows = 4, className }: { label: string; value: string; onChange: (v: string) => void; rows?: number; className?: string }) {
  return (
    <Field label={label} className={className}>
      {(id) => <textarea id={id} rows={Math.ceil(rows * 1.5)} className={`${INPUT} resize-y`} value={toEditable(value)} onChange={(e) => onChange(fromEditable(e.target.value))} />}
    </Field>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <Field label={label} className={className}>
      {(id) => (
        <select id={id} className={INPUT} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map(([v, text]) => (
            <option key={v} value={v}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Button({
  children,
  variant = 'plain',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'plain' | 'primary' | 'danger' }) {
  const styles = {
    plain: 'border-transparent bg-black/[.04] text-ink hover:bg-black/10',
    primary: 'border-transparent bg-forest text-white hover:bg-forest-soft',
    danger: 'border-transparent text-red-700 hover:bg-red-50',
  }
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-6 items-center justify-center rounded-md border px-2 text-xs font-medium normal-case leading-none tracking-normal transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** A delete that needs a second click, so a slip costs nothing. Reverts after a few seconds. */
export function DeleteButton({ label = 'Delete', className = '', onConfirm }: { label?: string; className?: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  useEffect(() => {
    if (!asking) return
    const timer = setTimeout(() => setAsking(false), 4000)
    return () => clearTimeout(timer)
  }, [asking])
  if (!asking)
    return (
      <Button variant="danger" className={className} onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  return (
    <span className={`flex gap-1 ${className}`}>
      <Button
        variant="primary"
        className="bg-red-700! hover:bg-red-800!"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        {label} for sure
      </Button>
      <Button onClick={() => setAsking(false)}>Keep</Button>
    </span>
  )
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
