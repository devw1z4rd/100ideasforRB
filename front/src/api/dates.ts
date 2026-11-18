// PocketBase dates look like "2026-10-29 19:40:11.826Z" (UTC, space separator); Safari's Date can't parse
// that.

export function parsePbDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value.replace(" ", "T"))
  return Number.isNaN(date.getTime()) ? null : date
}

export function pbDay(value: string): string {
  return value.slice(0, 10)
}

const MINSK_OFFSET_MS = 3 * 3600_000

export function minskDay(value: string): string {
  const date = parsePbDate(value)
  return date ? new Date(date.getTime() + MINSK_OFFSET_MS).toISOString().slice(0, 10) : ""
}
