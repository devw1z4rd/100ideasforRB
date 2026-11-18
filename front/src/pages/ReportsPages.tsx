import { useState } from "react"
import { Link, Navigate } from "react-router"
import { logout, useAuth } from "@/api/auth"
import { deviceReports, useDeviceReports, useReports, useReportsRealtime } from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { QueueItem } from "@/components/reports/QueueItem"
import { ReportList } from "@/components/reports/ReportBits"
import { Button } from "@/components/ui/button"
import { cta } from "@/content/nav"
import { mePage, moderationPage, publicStatuses, reportsPage } from "@/content/reports"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"

const h1 = "font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]"

export function ReportsPage() {
  useDocumentTitle(reportsPage.title)
  useReportsRealtime()
  const { user } = useAuth()
  const [tab, setTab] = useState<"all" | "mine">("all")
  const all = useReports({ status: publicStatuses })
  const mine = useReports({ author: user?.id ?? "-" })
  const hasDevice = deviceReports().length > 0
  const device = useDeviceReports(!user && hasDevice)
  const list = tab === "mine" ? (user ? mine : device) : all

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
      <div className="mt-6">
        <ReportList
          reports={list.data ?? []}
          empty={list.isPending ? "Загружаем…" : tab === "mine" ? reportsPage.mineEmpty : reportsPage.empty}
        />
      </div>
    </Container>
  )
}

export function ModerationPage() {
  useDocumentTitle(moderationPage.title)
  useReportsRealtime()
  const { isModerator } = useAuth()
  const queue = useReports({ status: ["new"] })
  const inWork = useReports({ status: ["accepted", "forwarded"] })

  if (!isModerator) {
    return (
      <Container className="py-24">
        <h1 className={h1}>{moderationPage.title}</h1>
        <p className="mt-4 text-muted-foreground">{moderationPage.forbidden}</p>
      </Container>
    )
  }
  return (
    <Container className="py-10 md:py-16">
      <h1 className={h1}>{moderationPage.title}</h1>
      <p className="mt-4 max-w-[70ch] text-fg-secondary">{moderationPage.lead}</p>
      <h2 className="mt-10 text-sm font-medium">
        {moderationPage.queue}{" "}
        <span className="text-muted-foreground tabular-nums">{queue.data?.length ?? ""}</span>
      </h2>
      <Queue reports={[...(queue.data ?? [])].reverse()} />
      <h2 className="mt-10 text-sm font-medium">
        {moderationPage.inWork}{" "}
        <span className="text-muted-foreground tabular-nums">{inWork.data?.length ?? ""}</span>
      </h2>
      <Queue reports={inWork.data ?? []} />
    </Container>
  )
}

function Queue({ reports }: { reports: Parameters<typeof QueueItem>[0]["report"][] }) {
  if (!reports.length) return <p className="mt-3 py-6 text-muted-foreground">{moderationPage.empty}</p>
  return (
    <ul className="mt-3 flex flex-col gap-3">
      {reports.map((r) => (
        <li key={r.id}>
          <QueueItem report={r} />
        </li>
      ))}
    </ul>
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
