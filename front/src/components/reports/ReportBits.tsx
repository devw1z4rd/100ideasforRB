import { useState } from "react"
import { Link } from "react-router"
import { deviceKey, reportPhotoUrl, type ReportWithDistrict } from "@/api/reports"
import type { ReportsStatusOptions } from "@/api/pocketbase-types"
import { ReportIcon } from "@/components/map/ReportIcon"
import { categoryLabels, statusLabels } from "@/content/reports"
import { cn } from "@/lib/utils"

type PhotoUrlArgs = Parameters<typeof reportPhotoUrl>

/**
 * A report photo, or the category icon if the browser can't show it: the form only uploads photos the
 * browser could decode, but a HEIC sent past it (straight to the API) would otherwise be a broken image.
 */
export function ReportPhoto({
  report,
  file,
  thumb,
  className,
  iconClassName = "size-8",
}: {
  report: PhotoUrlArgs[0]
  file: string
  thumb?: PhotoUrlArgs[2]
  className?: string
  iconClassName?: string
}) {
  const [broken, setBroken] = useState(false)
  if (broken)
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <ReportIcon category={report.category} className={iconClassName} />
      </div>
    )
  return (
    <img
      src={reportPhotoUrl(report, file, thumb)}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={className}
    />
  )
}

const statusDot: Record<ReportsStatusOptions, string> = {
  new: "bg-muted-foreground",
  accepted: "bg-(--link)",
  forwarded: "bg-aqi-moderate",
  resolved: "bg-success",
  rejected: "bg-destructive",
}

export function StatusBadge({ status, className }: { status: ReportsStatusOptions; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", statusDot[status])} />
      {statusLabels[status]}
    </span>
  )
}

export const districtLabel = (name: string | undefined) =>
  !name ? undefined : /^г\.|^Гомель$/.test(name) ? name : `${name} район`

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone = score >= 70 ? "bg-success" : score >= 40 ? "bg-aqi-moderate" : "bg-destructive"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs whitespace-nowrap tabular-nums",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", tone)} />
      Похоже на правду: {score}%
    </span>
  )
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Minsk",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

export function ReportList({ reports, empty }: { reports: readonly ReportWithDistrict[]; empty: string }) {
  if (!reports.length) return <p className="py-10 text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y divide-border border-y border-border">
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            to={deviceKey(r.id) ? `/reports/${r.id}?key=${deviceKey(r.id)}` : `/reports/${r.id}`}
            className="flex gap-4 py-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring md:px-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{categoryLabels[r.category]}</span>
                <StatusBadge status={r.status} />
                {r.auto_check && <ScoreBadge score={r.auto_check.score} />}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
                {[districtLabel(r.expand?.district?.name), formatDateTime(r.created)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {r.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-fg-secondary">{r.description}</p>
              )}
            </div>
            {r.photos?.[0] && (
              <ReportPhoto
                report={r}
                file={r.photos[0]}
                thumb="160x160"
                iconClassName="size-6"
                className={cn(
                  "size-16 shrink-0 rounded-lg object-cover md:size-20",
                  r.status === "new" && r.auto_check && "blur-md",
                )}
              />
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
