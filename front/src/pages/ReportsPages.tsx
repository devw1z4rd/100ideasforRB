import { useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router"
import { logout, useAuth } from "@/api/auth"
import { deviceReports, useDeviceReports, useReports, useReportsRealtime } from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { parseReportCategory, ReportFilters } from "@/components/reports/ReportFilters"
import { ReportList } from "@/components/reports/ReportBits"
import { Button } from "@/components/ui/button"
import { cta } from "@/content/nav"
import { mePage, publicStatuses, reportsPage } from "@/content/reports"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"

const h1 = "font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]"

export function ReportsPage() {
  useDocumentTitle(reportsPage.title)
  useReportsRealtime()
  const { user } = useAuth()
  const [tab, setTab] = useState<"all" | "mine">("all")
  const [params, setParams] = useSearchParams()
  const rawDistrict = params.get("district") ?? ""
  const district = /^[a-z0-9]{15}$/.test(rawDistrict) ? rawDistrict : ""
  const category = parseReportCategory(params.get("category"))
  const filtered = Boolean(district || category)
  const all = useReports({
    status: publicStatuses,
    district: district || undefined,
    category: category || undefined,
    duplicates: "exclude",
  })
  const mine = useReports({ author: user?.id ?? "-" })
  const hasDevice = deviceReports().length > 0
  const device = useDeviceReports(!user && hasDevice)
  const list = tab === "mine" ? (user ? mine : device) : all

  function updateFilters(values: Partial<Record<"district" | "category", string>>) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(values)) {
      if (value) next.set(name, value)
      else next.delete(name)
    }
    setParams(next, { replace: true })
  }

  return (
    <Container className="py-10 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={h1}>{reportsPage.title}</h1>
          <p className="mt-4 max-w-[70ch] text-fg-secondary">{reportsPage.lead}</p>
        </div>
        <Button asChild size="lg">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      </div>
      {(user || hasDevice) && (
        <div className="mt-8 flex gap-1">
          {(["all", "mine"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? reportsPage.all : reportsPage.mine}
            </button>
          ))}
        </div>
      )}
      {tab === "all" && (
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            <ReportFilters
              district={district}
              category={category}
              onDistrict={(value) => updateFilters({ district: value })}
              onCategory={(value) => updateFilters({ category: value })}
            />
          </div>
          {filtered && (
            <Button variant="ghost" onClick={() => updateFilters({ district: "", category: "" })}>
              {reportsPage.resetFilters}
            </Button>
          )}
        </div>
      )}
      <div className="mt-6">
        {list.isError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p role="alert" className="text-sm text-destructive">{reportsPage.loadFailed}</p>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>{reportsPage.retry}</Button>
          </div>
        ) : (
          <ReportList
            reports={list.data ?? []}
            empty={list.isPending ? reportsPage.loading : tab === "mine" ? reportsPage.mineEmpty : filtered ? reportsPage.filteredEmpty : reportsPage.empty}
          />
        )}
      </div>
    </Container>
  )
}

export function MePage() {
  useDocumentTitle(mePage.title)
  useReportsRealtime()
  const { user, isModerator } = useAuth()
  const mine = useReports({ author: user?.id ?? "-" })
  if (!user) return <Navigate to="/login?next=/me" replace />

  return (
    <Container className="py-10 md:py-16">
      <h1 className={h1}>{user.name || mePage.title}</h1>
      <p className="mt-3 text-muted-foreground">{user.email}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link to={cta.to}>{mePage.newReport}</Link>
        </Button>
        {isModerator && (
          <Button asChild size="lg" variant="outline">
            <Link to="/moderation">{mePage.moderation}</Link>
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={logout}>
          {mePage.logout}
        </Button>
      </div>
      <h2 className="mt-12 text-sm font-medium">{reportsPage.mine}</h2>
      <div className="mt-3">
        <ReportList reports={mine.data ?? []} empty={mine.isPending ? "Загружаем…" : reportsPage.mineEmpty} />
      </div>
    </Container>
  )
}
