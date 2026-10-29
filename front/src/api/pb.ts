import PocketBase from "pocketbase"
import type { TypedPocketBase } from "./pocketbase-types"

/**
 * Клиент PocketBase. Сайт и API живут на одном origin (CLAUDE.md §6): в dev `/api` проксирует Vite,
 * в проде статику и API отдаёт сам PocketBase. VITE_PB_URL — для запуска фронта против удалённого бэка.
 * Компоненты клиент не трогают (§13) — только хуки из src/api.
 */
export const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? "/") as TypedPocketBase

// Отмену и дедупликацию одинаковых запросов делает TanStack Query; автоотмена SDK обрывала бы параллельные запросы
pb.autoCancellation(false)
