import { useMemo } from "react"
import { Link } from "react-router"
import { useRiverLevels, useRiverPosts } from "@/api/rivers"
import { riverColor } from "@/components/map/riverColor"
import { RiverTriangle } from "@/components/map/RiverTriangle"
import { Skeleton } from "@/components/ui/skeleton"
import { water } from "@/content/water"
import { formatNumber } from "@/lib/format"
import { latestDay, navigable, summarizePosts, type PostSummary } from "@/lib/rivers"
import { formatDayLong } from "../air/format"
import { levelPosition } from "./levelText"
import { RiverChart } from "./RiverChart"

const text = water.levels

/**
 * «Уровень воды сегодня» (§10.8): посты Белгидромета в области на 8:00. Судоходные реки — карточками с порогом
 * судоходства и графиком за 30 дней, остальные — списком. Сантиметры сравниваются только с порогами своего поста.
 */
export function RiverLevels() {
  const posts = useRiverPosts()
  const levels = useRiverLevels()
  const summaries = useMemo(
    () => (posts.data && levels.data ? summarizePosts(posts.data, levels.data) : []),
    [posts.data, levels.data],
  )

  if (posts.isError || levels.isError) return <p className="text-sm text-muted-foreground">{water.error}</p>
  if (posts.isPending || levels.isPending) return <Skeleton className="h-[420px] w-full rounded-xl" />
  if (!summaries.length) return null

  const day = latestDay(summaries)!
  const main = summaries.filter((s) => navigable(s.post))
  const others = summaries.filter((s) => !navigable(s.post))
  const low = main.filter((s) => s.status === "low").length

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">
          {text.title}{" "}
          <span className="font-normal text-muted-foreground">{text.asOf(formatDayLong(day))}</span>
        </h3>
        <a
          href={water.levelsSource.url}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] font-medium text-link hover:text-link-hover"
        >
          {text.source} →
        </a>
      </div>

      {main.length > 0 && (
        <p className="mt-4 flex items-baseline gap-3 border-y border-border py-5">
          {low > 0 ? (
            <>
              <span className="shrink-0 font-heading text-[56px] leading-none font-semibold tracking-[-0.04em] whitespace-nowrap tabular-nums">
                {text.summary(low, main.length)}
              </span>
              <span className="max-w-[34ch] text-sm text-muted-foreground">{text.summaryCaption}</span>
            </>
          ) : (
            <span className="text-sm">{text.summaryNone}</span>
          )}
        </p>
      )}

      {/* Телефон: карточки листаются вбок, чтобы семь постов не растягивали страницу на три экрана */}
      <ul className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:items-stretch sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        {main.map((s) => (
          <li key={s.post.id} className="w-[85%] shrink-0 snap-start sm:w-auto">
            <PostCard summary={s} day={day} />
          </li>
        ))}
        <li className="w-[85%] shrink-0 snap-start sm:w-auto">
          <HowToRead />
        </li>
      </ul>

      {others.length > 0 && (
        <div className="mt-10">
          <h4 className="text-sm font-medium">{text.others}</h4>
          <ul className="mt-3 grid border-t border-border text-[13px] sm:grid-cols-2 sm:gap-x-10 xl:grid-cols-3">
            {others.map((s) => (
              <li
                key={s.post.id}
                className="flex items-baseline justify-between gap-3 border-b border-border py-2.5"
              >
                <span className="min-w-0">
                  <span className="font-medium">{s.post.river}</span>{" "}
                  <span className="text-muted-foreground">{s.post.name}</span>
                  <span className="block text-[12px] text-muted-foreground">{otherNote(s, day)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                  <RiverTriangle trend={s.trend} status={s.status} />
                  {formatNumber(s.latest.level)} {text.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PostCard({ summary: s, day }: { summary: PostSummary; day: string }) {
  const { post, latest } = s
  return (
    <article className="h-full rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{post.river}</p>
          <h4 className="font-heading text-lg leading-tight font-semibold">{post.name}</h4>
        </div>
        <StatusLabel status={s.status} />
      </div>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className="font-heading text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {formatNumber(latest.level)}
        </span>
        <span className="text-muted-foreground">{text.unit}</span>
        <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
          <RiverTriangle trend={s.trend} status={s.status} className="size-2.5" />
          {text.change(latest.change)}
        </span>
      </p>

      <RiverChart summary={s} />

      <p className="mt-3 text-[13px]">{levelPosition(s)}</p>
      {s.daysLow !== null && (
        <p className="mt-0.5 text-[12px] text-muted-foreground">{text.daysLow(s.daysLow, s.series.length)}</p>
      )}
      {latest.day < day && (
        <p className="mt-0.5 text-[12px] text-muted-foreground">{text.stale(formatDayLong(latest.day))}</p>
      )}
    </article>
  )
}

function HowToRead() {
  return (
    <aside className="h-full rounded-xl bg-muted p-4 text-[13px]">
      <h4 className="font-heading text-lg leading-tight font-semibold">{text.howTo.title}</h4>
      <ul className="mt-3 space-y-1.5">
        {(["low", "normal", "flood", "danger"] as const).map((status) => (
          <li key={status} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 translate-y-[-1px] rounded-full"
              style={{ background: riverColor[status] }}
            />
            <span>
              <span className="font-medium">{text.status[status]}</span> — {text.howTo.status[status]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground">
        {(["up", "flat", "down"] as const).map((trend) => (
          <span key={trend} className="inline-flex items-center gap-1">
            <RiverTriangle trend={trend} status="normal" className="size-2.5" />
            {text.howTo.trend[trend]}
          </span>
        ))}
      </p>
      <p className="mt-3 leading-[1.5] text-muted-foreground">{text.note}</p>
      <Link to={text.howTo.more.to} className="mt-3 inline-block font-medium text-link hover:text-link-hover">
        {text.howTo.more.label} →
      </Link>
    </aside>
  )
}

function StatusLabel({ status }: { status: PostSummary["status"] }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[12px] font-medium">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: riverColor[status] }} />
      {text.status[status]}
    </span>
  )
}

/** Строка под несудоходным постом: статус, если уровень у порога, иначе запас до поймы */
function otherNote(s: PostSummary, day: string): string {
  const parts: string[] = []
  parts.push(s.status === "normal" ? levelPosition(s) : text.status[s.status])
  parts.push(text.change(s.latest.change))
  if (s.latest.day < day) parts.push(text.stale(formatDayLong(s.latest.day)))
  return parts.join(" · ")
}
