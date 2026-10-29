// Хуки данных против настоящего PocketBase: схема, API rules, seed и сбор воздуха из back/.
// Запускается только с адресом сервера, иначе пропускается:
//   PB_TEST_URL=http://127.0.0.1:8090 PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… npx vitest run src/api
// Нужны `pocketbase seed`, `pocketbase air-backfill` и `pocketbase river-fetch` (CLAUDE.md §12). Созданные записи удаляются в конце.
import { QueryClient } from "@tanstack/react-query"
import PocketBase from "pocketbase"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { airDailyQuery, airUpdatedAtQuery, latestAirQuery } from "./air"
import { regionsForYear } from "@/lib/emissions"
import { emissionStatsQuery } from "./emissions"
import { login, logout, register } from "./auth"
import { pb } from "./pb"
import type { TypedPocketBase } from "./pocketbase-types"
import { changeReportStatus, createReport, reportEventsQuery, reportQuery, reportsQuery } from "./reports"
import { airPointsQuery, districtGeometryQuery, districtsQuery, sourcesQuery } from "./reference"
import { riverLevelsQuery, riverPostsQuery } from "./rivers"
import { summarizePosts } from "@/lib/rivers"

// Тесты идут в Node, но собираются с tsconfig приложения, где типов Node нет
declare const process: { env: Record<string, string | undefined> }

const url = process.env.PB_TEST_URL
const run = Date.now().toString(36)
const password = "testpassword123"
// queryOptions из src/api — через QueryClient без React; кэш общий на файл, ключи в тестах не повторяются
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const fetchQuery = client.fetchQuery.bind(client)
const day = (shift: number) =>
  new Date(Date.now() + 3 * 3600_000 + shift * 86400_000).toISOString().slice(0, 10)

describe.skipIf(!url)("api against PocketBase", () => {
  const admin = new PocketBase(url) as TypedPocketBase
  const created: Array<["users" | "reports", string]> = []

  beforeAll(async () => {
    pb.baseURL = url!
    await admin
      .collection("_superusers")
      .authWithPassword(process.env.PB_SUPERUSER_EMAIL!, process.env.PB_SUPERUSER_PASSWORD!)
  })

  afterAll(async () => {
    logout()
    for (const [collection, id] of created.reverse())
      await admin
        .collection(collection)
        .delete(id)
        .catch(() => {})
  })

  it("reference data comes from the seed", async () => {
    const districts = await fetchQuery(districtsQuery())
    expect(districts).toHaveLength(22)
    expect(districts.find((d) => d.name === "г. Гомель")?.center).toEqual({ lat: 52.4345, lon: 30.9754 })
    expect(districts[0]).not.toHaveProperty("geometry")

    const geometry = await fetchQuery(districtGeometryQuery())
    expect(geometry.every((d) => d.geometry?.type === "Polygon" || d.geometry?.type === "MultiPolygon")).toBe(
      true,
    )

    const sources = await fetchQuery(sourcesQuery())
    expect(sources.find((s) => s.title.startsWith("Open-Meteo"))?.kind).toBe("model")
    expect(await fetchQuery(airPointsQuery())).toHaveLength(21)
  })

  it("air: latest per point, freshness and daily aggregates", async () => {
    const latest = await fetchQuery(latestAirQuery())
    expect(latest.size).toBe(21)

    const updated = await fetchQuery(airUpdatedAtQuery())
    expect(Date.now() - updated!.getTime()).toBeLessThan(24 * 3600_000)

    const daily = await fetchQuery(airDailyQuery(day(-7), day(-1)))
    expect(daily).toHaveLength(21 * 7)
    expect(daily[0].day).toBe(day(-7))
  })

  it("emissions: Belstat seed reproduces the published oblast figures", async () => {
    const rows = await fetchQuery(emissionStatsQuery())
    const gomel = (year: number) =>
      regionsForYear(rows, year).regions.find((r) => r.territory === "Гомельская область")!
    // Опубликовано: 108,2 тыс. т (2023, стратегия области), 95,078 (2024, бюллетень Минприроды), 80 (2025, буклет Белстата)
    expect(gomel(2023).emitted).toBeCloseTo(108.2, 1)
    expect(gomel(2024).emitted).toBeCloseTo(95.08, 1)
    expect(Math.round(gomel(2025).emitted)).toBe(80)
    expect(gomel(2025).rank).toBe(2)
  })

  it("rivers: oblast posts with thresholds and a month of daily levels", async () => {
    const posts = await fetchQuery(riverPostsQuery())
    const gomel = posts.find((p) => p.river === "Сож" && p.name === "Гомель")!
    expect(gomel.low_level).toBeGreaterThan(0)
    expect(gomel.district).not.toBe("")
    // Пост на пограничном Днепре — в 0,5 км за полигоном района, должен попасть в область
    expect(posts.some((p) => p.name === "Лоев")).toBe(true)

    const summaries = summarizePosts(posts, await fetchQuery(riverLevelsQuery()))
    expect(summaries).toHaveLength(posts.length)
    const sozh = summaries.find((s) => s.post.id === gomel.id)!
    expect(sozh.series.length).toBeGreaterThanOrEqual(25)
    expect(sozh.latest.day >= day(-3)).toBe(true)
  })

  it("reports: create as a user, moderate, history and visibility", async () => {
    const author = await register({ email: `author-${run}@test.local`, password })
    created.push(["users", author.record.id])
    const report = await createReport({
      location: { lat: 52.4345, lon: 30.9754 },
      category: "dump",
      description: "Проверка слоя данных",
      photos: [],
    })
    created.push(["reports", report.id])
    expect(report.status).toBe("new")
    expect((await fetchQuery(reportsQuery({ author: author.record.id }))).map((r) => r.id)).toEqual([
      report.id,
    ])

    logout()
    await expect(fetchQuery(reportQuery(report.id))).rejects.toMatchObject({ status: 404 })

    const moderator = await admin.collection("users").create({
      email: `moder-${run}@test.local`,
      password,
      passwordConfirm: password,
      role: "moderator",
    })
    created.push(["users", moderator.id])
    await login(`moder-${run}@test.local`, password)
    await changeReportStatus({ id: report.id, status: "accepted", comment: "Принято" })

    logout()
    const events = await fetchQuery(reportEventsQuery(report.id))
    expect(events.map((e) => e.to_status)).toEqual(["new", "accepted"])
    expect(events[1].comment).toBe("Принято")
    const statuses = await fetchQuery(reportsQuery({ status: ["accepted"] }))
    expect(statuses.some((r) => r.id === report.id)).toBe(true)
  })
})
