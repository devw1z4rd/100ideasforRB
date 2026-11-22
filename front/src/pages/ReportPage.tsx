import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import { Link, useLocation, useParams, useSearchParams } from "react-router"
import { useAuth } from "@/api/auth"
import type { ReportsStatusOptions } from "@/api/pocketbase-types"
import {
  type AutoCheck,
  reportPhotoUrl,
  useChangeReportStatus,
  useKeyedReport,
  useReport,
  useReportEvents,
  useReportsRealtime,
} from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { PointPicker } from "@/components/reports/PointPicker"
import {
  districtLabel,
  formatDateTime,
  ReportPhoto,
  ScoreBadge,
  StatusBadge,
} from "@/components/reports/ReportBits"
import { Button } from "@/components/ui/button"
import {
  categoryLabels,
  reportCard as text,
  statusActions,
  statusHints,
  statusLabels,
  statusTransitions,
} from "@/content/reports"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"

export function ReportPage() {
  const { id = "" } = useParams()
  const { state } = useLocation() as { state?: { created?: boolean } }
  const key = useSearchParams()[0].get("key")
  const keyed = useKeyedReport(id, key)
  const plain = useReport(id)
  const plainEvents = useReportEvents(id)
  useReportsRealtime()
  const { isModerator } = useAuth()
  const [revealed, setRevealed] = useState(false)
  const r = key ? (keyed.data?.report ?? plain.data) : plain.data
  const events = { data: key && keyed.data ? keyed.data.events : plainEvents.data }
  useDocumentTitle(r ? `${categoryLabels[r.category]} — обращение` : "Обращение")

  if (key ? keyed.isPending : plain.isPending)
    return <Container className="py-24 text-muted-foreground">Загружаем…</Container>
  if (!r) {
    return (
      <Container className="py-24">
        <p className="text-muted-foreground">{text.notFound}</p>
        <BackLink />
      </Container>
    )
  }

  return (
    <Container className="py-10 md:py-16">
      <BackLink />
      {state?.created && (
        <div role="status" className="mt-6 rounded-xl bg-muted px-4 py-3 text-sm">
          <p>{key ? text.createdAnonymous : text.created}</p>
          {key && <CopyLink />}
        </div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
              {categoryLabels[r.category]}
            </h1>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground tabular-nums">
            {[districtLabel(r.expand?.district?.name), formatDateTime(r.created)].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2 text-sm text-fg-secondary">{statusHints[r.status]}</p>

          <p className="mt-6 whitespace-pre-line">{r.description}</p>

          {r.moderator_comment && (
            <div className="mt-6 border-l-2 border-border pl-4">
              <p className="text-[13px] text-muted-foreground">{text.moderatorComment}</p>
              <p className="mt-1 text-sm whitespace-pre-line">{r.moderator_comment}</p>
            </div>
          )}

          {r.photos && r.photos.length > 0 && isModerator && r.status === "new" && !revealed && (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
              {text.photosHidden}
              <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
                {text.showPhotos}
              </Button>
            </div>
          )}
          {r.photos && r.photos.length > 0 && (
            <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {r.photos.map((f) => (
                <li key={f}>
                  <a href={reportPhotoUrl(r, f)} target="_blank" rel="noreferrer" className="block">
                    <ReportPhoto
                      report={r}
                      file={f}
                      thumb="640x0"
                      className={cn(
                        "aspect-square w-full rounded-lg object-cover",
                        isModerator && r.status === "new" && !revealed && "blur-xl",
                      )}
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}

          {isModerator && statusTransitions[r.status].length > 0 && (
            <ModerationPanel id={r.id} status={r.status} check={r.auto_check} />
          )}

          <h2 className="mt-10 text-sm font-medium">{text.history}</h2>
          <ol className="mt-3 border-l border-border">
            {(events.data ?? []).map((e) => (
              <li key={e.id} className="relative pb-4 pl-5">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[4.5px] size-2 rounded-full bg-foreground"
                />
                <p className="text-sm">
                  {e.from_status
                    ? `${statusLabels[e.from_status as ReportsStatusOptions]} → ${statusLabels[e.to_status as ReportsStatusOptions]}`
                    : text.historyCreated}
                </p>
                <p className="text-[13px] text-muted-foreground tabular-nums">{formatDateTime(e.created)}</p>
                {e.comment && <p className="mt-1 text-sm text-fg-secondary">{e.comment}</p>}
              </li>
            ))}
          </ol>
        </div>

        <PointPicker
          value={r.location}
          readOnly
          appearance="light"
          className="h-[320px] overflow-hidden rounded-xl border border-border lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:h-[520px]"
        />
      </div>
    </Container>
  )
}

function CopyLink() {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      className="mt-3"
      onClick={() =>
        void navigator.clipboard?.writeText(location.href).then(
          () => setCopied(true),
          () => setCopied(false),
        )
      }
    >
      {copied ? text.copied : text.copyLink}
    </Button>
  )
}

function BackLink() {
  return (
    <Link
      to="/reports"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-link transition-colors hover:text-link-hover"
    >
      <ArrowLeft className="size-4" />
      {text.back}
    </Link>
  )
}

function ModerationPanel({
  id,
  status,
  check,
}: {
  id: string
  status: ReportsStatusOptions
  check: AutoCheck | null
}) {
  const change = useChangeReportStatus()
  const [comment, setComment] = useState("")
  return (
    <section className="mt-8 rounded-xl border border-border p-4">
      <h2 className="text-sm font-medium">{text.moderate}</h2>
      {check && (
        <div className="mt-3">
          <ScoreBadge score={check.score} />
          <ul className="mt-2 flex flex-col gap-0.5 text-[13px] text-muted-foreground">
            {check.reasons.map((reason) => (
              <li key={reason.text} className="tabular-nums">
                <span className={reason.delta > 0 ? "text-(--success-ink)" : "text-destructive"}>
                  {reason.delta > 0 ? "+" : "−"}
                  {Math.abs(reason.delta)}
                </span>{" "}
                {reason.text}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[12px] text-muted-foreground">{text.autoCheckHint}</p>
        </div>
      )}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={text.commentPlaceholder}
        rows={3}
        className="mt-3 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {statusTransitions[status].map((to) => (
          <Button
            key={to}
            variant={to === "rejected" ? "outline" : "default"}
            disabled={change.isPending}
            onClick={() =>
              change.mutate(
                { id, status: to, comment: comment.trim() || undefined },
                { onSuccess: () => setComment("") },
              )
            }
          >
            {statusActions[to]}
          </Button>
        ))}
      </div>
      {change.error && (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          {text.failed}
        </p>
      )}
    </section>
  )
}
