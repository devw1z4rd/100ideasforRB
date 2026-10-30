import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

// Поля калькулятора: числа вводятся текстом с inputMode="decimal" — так работает и запятая, и точка (lib/carbon parseAmount)

const control =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-[15px] tabular-nums transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/30 focus-visible:border-ring"

export function NumberField({
  label,
  unit,
  hint,
  value,
  placeholder = "0",
  onChange,
  className,
}: {
  label: string
  unit?: string
  hint?: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
        {hint && <span className="font-normal text-muted-foreground"> · {hint}</span>}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,\s]/g, ""))}
          className={cn(control, unit && "pr-32")}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(control, "mt-1.5 cursor-pointer")}
      >
        {children}
      </select>
    </div>
  )
}

/** Выбор одного варианта кнопками (топливо, рацион) */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ key: T; label: string; hint?: string }>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", className)}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "cursor-pointer rounded-md border px-3 py-2 text-left text-[14px] transition-colors",
            value === o.key
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-input hover:border-foreground/30",
          )}
        >
          <span className="block font-medium">{o.label}</span>
          {o.hint && (
            <span
              className={cn("block text-[12px]", value === o.key ? "opacity-75" : "text-muted-foreground")}
            >
              {o.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="font-heading text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      {hint && <p className="mt-1 max-w-[60ch] text-[13px] text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
