import type { GeoPoint, ReportsCategoryOptions } from "@/api/pocketbase-types"

// Storage may be unavailable (private mode): then the form works without a draft.

export type ReportDraft = {
  point: GeoPoint | null
  category: ReportsCategoryOptions | null
  description: string
}

const KEY = "eco-report-draft"
const EMPTY: ReportDraft = { point: null, category: null, description: "" }

export function loadDraft(): ReportDraft {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null")
    return raw && typeof raw === "object" ? { ...EMPTY, ...(raw as Partial<ReportDraft>) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function saveDraft(draft: ReportDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {}
}

function photoStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("eco-report-draft", 1)
    open.onupgradeneeded = () => open.result.createObjectStore("kv")
    open.onsuccess = () => resolve(open.result.transaction("kv", mode).objectStore("kv"))
    open.onerror = () => reject(open.error)
  })
}

export async function savePhotos(files: readonly File[]) {
  try {
    ;(await photoStore("readwrite")).put([...files], "photos")
  } catch {}
}

export async function loadPhotos(): Promise<File[]> {
  try {
    const store = await photoStore("readonly")
    return await new Promise((resolve) => {
      const req = store.get("photos")
      req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as File[]) : [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
  void savePhotos([])
}
