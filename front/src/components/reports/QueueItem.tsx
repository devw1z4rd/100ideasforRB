import { ArrowRight, Eye } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { reportPhotoUrl, useChangeReportStatus, type ReportWithDistrict } from "@/api/reports"
import { ReportIcon } from "@/components/map/ReportIcon"
import { districtLabel, formatDateTime, ScoreBadge, StatusBadge } from "@/components/reports/ReportBits"
import { Button } from "@/components/ui/button"
import { categoryLabels, moderationPage as text, statusActions, statusTransitions } from "@/content/reports"
import { cn } from "@/lib/utils"

export function QueueItem({ report: r }: { report: ReportWithDistrict }) {
  const change = useChangeReportStatus()
  const [revealed, setRevealed] = useState(r.status !== "new")
  const photo = r.photos?.[0]

  return (
    <article className="grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[160px_1fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:aspect-square">
        {photo ? (
          <>
            <img
              src={reportPhotoUrl(r, photo, "640x0")}
              alt=""
              loading="lazy"
              className={cn("size-full object-cover transition-[filter]", !revealed && "blur-xl")}
            />
            {!revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="absolute inset-0 grid place-items-center text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5">
                  <Eye className="size-4" />
                  {text.showPhoto}
                  {r.photos.length > 1 && ` · ${r.photos.length}`}
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <ReportIcon category={r.category} className="size-10" />
            <span className="sr-only">{text.noPhoto}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{categoryLabels[r.category]}</h3>
          <StatusBadge status={r.status} />
          {r.auto_check && <ScoreBadge score={r.auto_check.score} />}
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
          {[districtLabel(r.expand?.district?.name), formatDateTime(r.created), !r.author && text.anonymous]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {r.description ? (
          <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line">{r.description}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{text.noDescription}</p>
        )}
        {r.auto_check && r.auto_check.reasons.length > 0 && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {r.auto_check.reasons
              .map((x) => `${x.delta > 0 ? "+" : "−"}${Math.abs(x.delta)} ${x.text}`)
              .join(" · ")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-auto sm:pt-4">
          {statusTransitions[r.status].map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "rejected" ? "outline" : "default"}
              disabled={change.isPending}
              onClick={() => change.mutate({ id: r.id, status: to })}
            >
              {statusActions[to]}
            </Button>
          ))}
          <Button asChild size="sm" variant="ghost" className="ml-auto">
            <Link to={`/reports/${r.id}`}>
              {text.open}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        {change.error && <p className="mt-2 text-[13px] text-destructive">{text.failed}</p>}
      </div>
    </article>
  )
}
