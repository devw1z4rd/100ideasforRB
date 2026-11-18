import type { GeoPoint, ReportsCategoryOptions } from "@/api/pocketbase-types"

// Черновик обращения на этом устройстве (CLAUDE.md §10.15): перезагрузили страницу или закрыли вкладку —
// введённое не пропадает. Текст и точка — в localStorage, фото — в IndexedDB (там хранятся файлы).
// Хранилище может быть недоступно (приватный режим) — тогда форма просто работает без черновика.

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
  } catch {
    // нет хранилища — без черновика
  }
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
  } catch {
    // нет IndexedDB — фото не переживут перезагрузку
  }
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

/** Обращение отправлено — черновик больше не нужен */
export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // нечего чистить
  }
  void savePhotos([])
}
