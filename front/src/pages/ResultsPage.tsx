import { ArrowRight } from "lucide-react"
import { Link } from "react-router"
import type { ReportsCategoryOptions } from "@/api/pocketbase-types"
import { reportPhotoUrl, useReportsRealtime, useShowcase, type ShowcaseReport } from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { ReportIcon } from "@/components/map/ReportIcon"
import { districtLabel, ReportList } from "@/components/reports/ReportBits"
import { Button } from "@/components/ui/button"
import { cta } from "@/content/nav"
import { categoryLabels, resultsPage as text } from "@/content/reports"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

const DAY = 86_400_000
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { timeZone: "Europe/Minsk", day: "numeric", month: "short" })
const daysBetween = (from: string, to: string) =>
  Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / DAY))
const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)
}

export function ResultsPage() {
  useDocumentTitle(text.nav)
  useReportsRealtime()
  const { data = [], isPending } = useShowcase()

  const resolved = data
    .filter(
      (r): r is ShowcaseReport & { resolvedAt: string } => r.status === "resolved" && Boolean(r.resolvedAt),
    )
    .sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt))
  const inWork = data.filter((r) => r.status === "accepted" || r.status === "forwarded")
  const typical = median(resolved.map((r) => daysBetween(r.created, r.resolvedAt)))
  const categories = (Object.keys(categoryLabels) as ReportsCategoryOptions[])
    .map((c) => ({
      c,
      total: data.filter((r) => r.category === c).length,
      done: data.filter((r) => r.category === c && r.status === "resolved").length,
    }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.done - a.done || b.total - a.total)

  return (
    <Container className="py-10 md:py-16">
      <h1 className="font-heading text-[clamp(32px,4vw,56px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>
      <p className="mt-4 max-w-[70ch] text-fg-secondary">{text.lead}</p>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border py-8 md:grid-cols-4">
        <Stat label={text.resolved} value={isPending ? "—" : String(resolved.length)} accent />
        <Stat label={text.inWork} value={isPending ? "—" : String(inWork.length)} />
        <Stat label={text.typical} value={typical === null ? "—" : text.days(typical)} />
        <Stat label={text.published} value={isPending ? "—" : String(data.length)} />
      </dl>

      {!isPending && resolved.length === 0 && (
        <section className="mt-12 max-w-[60ch]">
          <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em]">{text.emptyTitle}</h2>
          <p className="mt-3 text-fg-secondary">{text.emptyLead(inWork.length)}</p>
          <Button asChild size="lg" className="mt-6">
            <Link to={cta.to}>{text.cta}</Link>
          </Button>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.02em]">
            {text.stories}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resolved.map((r) => (
              <li key={r.id}>
                <Story report={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mt-14 max-w-[720px]">
          <h2 className="font-heading text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.02em]">
            {text.byCategory}
          </h2>
          <ul className="mt-6 flex flex-col gap-4">
            {categories.map(({ c, total, done }) => (
              <li key={c} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
                <ReportIcon category={c} className="size-5 text-muted-foreground" />
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{categoryLabels[c]}</span>
                  <span className="text-muted-foreground tabular-nums">{text.ofPublished(done, total)}</span>
                </div>
                <div className="col-start-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inWork.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.02em]">
            {text.nowInWork}
          </h2>
          <div className="mt-4">
            <ReportList reports={inWork} empty="" />
          </div>
        </section>
      )}
    </Container>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd
        className={
          accent
            ? "mt-1 font-heading text-[clamp(40px,5vw,64px)] leading-none font-semibold text-(--success-ink) tabular-nums"
            : "mt-1 font-heading text-[clamp(40px,5vw,64px)] leading-none font-semibold tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  )
}

function Story({ report: r }: { report: ShowcaseReport & { resolvedAt: string } }) {
  const days = daysBetween(r.created, r.resolvedAt)
  return (
    <Link
      to={`/reports/${r.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border transition-colors outline-none hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {r.photos?.[0] ? (
        <img
          src={reportPhotoUrl(r, r.photos[0], "640x0")}
          alt=""
          loading="lazy"
          className="aspect-[16/10] w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[16/10] w-full place-items-center bg-muted text-muted-foreground">
          <ReportIcon category={r.category} className="size-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[13px] text-muted-foreground">
          {[categoryLabels[r.category], districtLabel(r.expand?.district?.name)].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 text-sm tabular-nums">
          {text.reported} {shortDate(r.created)} → {text.fixed} {shortDate(r.resolvedAt)}{" "}
          <span className="font-medium text-(--success-ink)">
            {days === 0 ? text.sameDay : text.took(text.days(days))}
          </span>
        </p>
        {r.moderator_comment && (
          <p className="mt-3 line-clamp-3 text-sm text-fg-secondary">
            <span className="text-muted-foreground">{text.done}: </span>
            {r.moderator_comment}
          </p>
        )}
        <ArrowRight className="mt-auto size-4 self-end text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
