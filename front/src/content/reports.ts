import type { ReportsCategoryOptions, ReportsStatusOptions } from "@/api/pocketbase-types"

// Подписи обращений (CLAUDE.md §4 M3, §8): категории и статусы

export const categoryLabels: Record<ReportsCategoryOptions, string> = {
  dump: "Свалка",
  discharge: "Сброс в воду",
  smoke: "Дым, выбросы",
  felling: "Вырубка",
  burning: "Пал, горение",
  other: "Другое",
}

export const statusLabels: Record<ReportsStatusOptions, string> = {
  new: "Новое",
  accepted: "Принято",
  forwarded: "Передано",
  resolved: "Устранено",
  rejected: "Отклонено",
}

/** Статусы, которые видит любой посетитель (API rule reports) */
export const publicStatuses: readonly ReportsStatusOptions[] = ["accepted", "forwarded", "resolved"]
