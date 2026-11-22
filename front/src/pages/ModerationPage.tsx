import { useState } from "react"
import { useAuth } from "@/api/auth"
import type { ReportsCategoryOptions, ReportsStatusOptions } from "@/api/pocketbase-types"
import { useReports, useReportsRealtime } from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { QueueItem } from "@/components/reports/QueueItem"
import { ReportFilters, ReportFilterSelect } from "@/components/reports/ReportFilters"
import { Button } from "@/components/ui/button"
import { moderationPage as text, statusLabels } from "@/content/reports"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

const activeStatuses = ["new", "accepted", "forwarded"] as const
const statuses = Object.keys(statusLabels) as ReportsStatusOptions[]

export function ModerationPage() {
  useDocumentTitle(text.title)
  const { isModerator } = useAuth()
  return (
    <Container className="py-10 md:py-16">
      <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>
      {isModerator ? <ModerationQueue /> : <p className="mt-4 text-muted-foreground">{text.forbidden}</p>}
    </Container>
  )
}

function ModerationQueue() {
  useReportsRealtime()
  const [district, setDistrict] = useState("")
  const [category, setCategory] = useState<ReportsCategoryOptions | "">("")
  const [status, setStatus] = useState<ReportsStatusOptions | "active" | "all" | "duplicates">("active")
  const [order, setOrder] = useState<"oldest" | "newest">("oldest")
  const reports = useReports({
    district: district || undefined,
    category: category || undefined,
    status: status === "active" ? activeStatuses : status === "all" || status === "duplicates" ? undefined : [status],
    order,
    duplicates: status === "duplicates" ? "only" : "exclude",
  })

  return (
    <>
      <p className="mt-4 text-fg-secondary">{text.lead}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <ReportFilters district={district} category={category} onDistrict={setDistrict} onCategory={setCategory} />
        <ReportFilterSelect label={text.status} value={status} onChange={(value) => setStatus(value as typeof status)}>
          <option value="active">{text.active}</option>
          <option value="all">{text.allStatuses}</option>
          <option value="duplicates">{text.duplicates}</option>
          {statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
        </ReportFilterSelect>
        <ReportFilterSelect label={text.sort} value={order} onChange={(value) => setOrder(value as typeof order)}>
          <option value="oldest">{text.oldest}</option>
          <option value="newest">{text.newest}</option>
        </ReportFilterSelect>
      </div>
      <div className="mt-6">
        {reports.isError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p role="alert" className="text-destructive">{text.loadFailed}</p>
            <Button size="sm" variant="outline" onClick={() => void reports.refetch()}>{text.retry}</Button>
          </div>
        ) : reports.isPending ? (
          <p role="status" className="text-muted-foreground">{text.loading}</p>
        ) : (
          <>
            <p role="status" className="text-sm text-muted-foreground">{text.count(reports.data.length)}</p>
            {reports.data.length ? (
              <ul className="mt-3 flex flex-col gap-3">
                {reports.data.map((report) => <li key={report.id}><QueueItem report={report} /></li>)}
              </ul>
            ) : (
              <p className="mt-3 py-4 text-muted-foreground">
                {status === "active" && !district && !category ? text.empty : text.filteredEmpty}
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
