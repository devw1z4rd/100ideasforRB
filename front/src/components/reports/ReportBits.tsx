import { intlLocale, t } from "@/lib/locale"
import { useState } from "react"
import { Link } from "react-router"
import { deviceKey, reportPhotoUrl, useReportPhotoAccess, type ReportWithDistrict } from "@/api/reports"
import type { ReportsStatusOptions } from "@/api/pocketbase-types"
import { ReportIcon } from "@/components/map/ReportIcon"
import { districtLabel, districtName } from "@/content/placeNames"
import { categoryLabels, duplicateReports, statusLabels } from "@/content/reports"
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
  accessKey,
  openOriginal = false,
  className,
  iconClassName = "size-8",
}: {
  report: PhotoUrlArgs[0]
  file: string
  thumb?: PhotoUrlArgs[2]
  accessKey?: string | null
  openOriginal?: boolean
  className?: string
  iconClassName?: string
}) {
  const access = useReportPhotoAccess(report, accessKey)
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const src = access && reportPhotoUrl(report, file, thumb, access)
  const photo = src && brokenSrc !== src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBrokenSrc(src)}
      className={className}
    />
  ) : (
    <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
      <ReportIcon category={report.category} className={iconClassName} />
    </div>
  )
  return openOriginal && src && access ? (
    <a href={reportPhotoUrl(report, file, undefined, access)} target="_blank" rel="noreferrer" className="block">
      {photo}
    </a>
  ) : photo
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

export const reportDistrictLabel = (district: NonNullable<ReportWithDistrict["expand"]>["district"]) =>
  district ? districtLabel(districtName(district)) : undefined

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
      {t("Похоже на правду: ", "Падобна да праўды: ")}
      {score}%
    </span>
  )
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(intlLocale, {
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
                {r.duplicate_of && <span className="text-xs text-muted-foreground">{duplicateReports.badge}</span>}
                {r.auto_check && <ScoreBadge score={r.auto_check.score} />}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
                {[reportDistrictLabel(r.expand?.district), formatDateTime(r.created)]
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
                accessKey={deviceKey(r.id)}
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
