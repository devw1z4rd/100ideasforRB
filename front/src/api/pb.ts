import PocketBase from "pocketbase"
import type { TypedPocketBase } from "./pocketbase-types"

export const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? "/") as TypedPocketBase

// TanStack Query handles cancellation and dedup; the SDK's auto-cancellation would abort parallel requests.
pb.autoCancellation(false)
