import { ChevronRight, Maximize2 } from "lucide-react"
import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { useMemo, useState } from "react"
import { useRiverLevels, useRiverPosts } from "@/api/rivers"
import { useWaterReadings } from "@/api/water"
import { RiverPostDialog } from "@/components/map/RiverPostDialog"
import { riverColor } from "@/components/map/riverColor"
import { RiverTriangle } from "@/components/map/RiverTriangle"
import { Skeleton } from "@/components/ui/skeleton"
import { water } from "@/content/water"
import { formatNumber } from "@/lib/format"
import { hasThresholds, latestDay, summarizePosts, type PostSummary } from "@/lib/rivers"
import { riverPostAnchor } from "@/lib/focusTarget"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { cn } from "@/lib/utils"
import { latestQuarter, quarterLabel, sections as sectionsOf } from "@/lib/water"
import { formatDayLong } from "../air/format"
import { levelPosition } from "./levelText"
import { LevelSparkline } from "./LevelSparkline"

const text = water.levels
/** Телефон: столько постов видно сразу (хуже всего — первыми), остальные — по кнопке */
const MOBILE_FIRST = 6
/**
 * Уровень воды (§10.8): все посты Белгидромета в области карточками, хуже всего — первыми. В карточке — уровень,
 * изменение за сутки, статус к порогам поста и мини-график за 30 дней с зонами порогов; щелчок открывает окно поста
 * (то же, что на карте): график, пороги, другие посты реки и качество воды. Сантиметры сравниваются только
 * с порогами своего поста. На телефоне — компактный список строк (карусель из двух десятков карточек
 * приходилось листать по одной): пост, уровень, изменение и статус; касание открывает то же окно.
 */
export function RiverLevels() {
  const reduceMotion = useReducedMotion()
  const posts = useRiverPosts()
  const levels = useRiverLevels()
  const readings = useWaterReadings()
  const [openId, setOpenId] = useState<string | null>(null)
  const wide = useMediaQuery("(min-width: 640px)")
  const [all, setAll] = useState(false)

  const summaries = useMemo(
    () => (posts.data && levels.data ? summarizePosts(posts.data, levels.data) : []),
    [posts.data, levels.data],
  )
  const quarter = readings.data ? latestQuarter(readings.data) : null
  const sections = useMemo(
    () => (readings.data && quarter ? sectionsOf(readings.data, quarter) : []),
    [readings.data, quarter],
  )

  if (posts.isError || levels.isError) return <p className="text-sm text-muted-foreground">{water.error}</p>
  if (posts.isPending || levels.isPending) return <Skeleton className="h-[460px] w-full rounded-xl" />
  if (!summaries.length) return null

  const day = latestDay(summaries)!

  return (
    <div>
      <h3 className="mb-3 font-heading text-lg font-semibold sm:sr-only">{text.title}</h3>
      {!wide ? (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(all ? summaries : summaries.slice(0, MOBILE_FIRST)).map((s) => (
              <li key={s.post.id}>
                <PostRow summary={s} onOpen={() => setOpenId(s.post.id)} />
              </li>
            ))}
          </ul>
          {summaries.length > MOBILE_FIRST && (
            <button
              type="button"
              aria-expanded={all}
              onClick={() => setAll((v) => !v)}
              className="mt-3 h-12 w-full cursor-pointer rounded-xl bg-muted text-[15px] font-medium"
            >
              {all ? text.showLess : text.showAll(summaries.length)}
            </button>
          )}
        </>
      ) : (
        <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {summaries.map((s, i) => (
            // Карточки появляются волной, когда до них докрутили: по строке — слева направо
            <m.li
              key={s.post.id}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: (i % 4) * 0.06 }}
            >
              <PostCard summary={s} day={day} onOpen={() => setOpenId(s.post.id)} />
            </m.li>
          ))}
        </ul>
      )}

      <RiverPostDialog
        summary={summaries.find((s) => s.post.id === openId) ?? null}
        posts={summaries}
        sections={sections}
        quarter={quarter ? quarterLabel(quarter) : ""}
        onSelect={setOpenId}
        onClose={() => setOpenId(null)}
        inSection
      />
    </div>
  )
}

function PostCard({ summary: s, day, onOpen }: { summary: PostSummary; day: string; onOpen: () => void }) {
  const { post, latest } = s
  return (
    <button
      // Сюда ведёт «Подробнее» с карты: прокрутка к карточке и подсветка (lib/focusTarget.ts)
      id={riverPostAnchor(post.code)}
      type="button"
      aria-haspopup="dialog"
      aria-label={text.open(
        post.river,
        post.name,
        `${formatNumber(latest.level)} ${text.unit}${hasThresholds(post) ? `, ${text.status[s.status]}` : ""}`,
      )}
      onClick={onOpen}
      className="group flex h-full w-full cursor-pointer flex-col rounded-xl border border-border p-4 text-left transition-[border-color,box-shadow] hover:border-input hover:shadow-sm"
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[13px] text-muted-foreground">{post.river}</span>
          <span className="block font-heading text-lg leading-tight font-semibold">{post.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          {hasThresholds(post) && <StatusLabel status={s.status} />}
          <Maximize2
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-colors group-hover:text-foreground"
          />
        </span>
      </span>

      <span className="mt-3 flex w-full flex-wrap items-baseline gap-x-2 gap-y-1.5">
        <span className="font-heading text-[36px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {formatNumber(latest.level)}
        </span>
        <span className="text-muted-foreground">{text.unit}</span>
        <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
          <RiverTriangle trend={s.trend} status={s.status} className="size-2.5" />
          {text.change(latest.change)}
        </span>
      </span>

      <LevelSparkline summary={s} className="mt-3 w-full" />

      <span className={cn("mt-auto pt-3 text-[13px]", !hasThresholds(post) && "text-muted-foreground")}>
        {note(s)}
      </span>
      {latest.day < day && (
        <span className="mt-1 text-[12px] text-muted-foreground">
          {text.stale(formatDayLong(latest.day))}
        </span>
      )}
    </button>
  )
}

/** Телефон: пост одной строкой — название и река, статус; справа уровень и изменение за сутки */
function PostRow({ summary: s, onOpen }: { summary: PostSummary; onOpen: () => void }) {
  const { post, latest } = s
  return (
    <button
      id={riverPostAnchor(post.code)}
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base leading-tight font-semibold">{post.name}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {hasThresholds(post) && (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: riverColor[s.status] }}
            />
          )}
          <span className="truncate">
            {post.river}
            {hasThresholds(post) && ` · ${text.status[s.status]}`}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-heading text-xl leading-tight font-semibold tabular-nums">
          {formatNumber(latest.level)}
          <span className="ml-1 text-[13px] font-normal text-muted-foreground">{text.unit}</span>
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-[13px] text-muted-foreground tabular-nums">
          <RiverTriangle trend={s.trend} status={s.status} className="size-2.5" />
          {text.changeShort(latest.change)}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function StatusLabel({ status, className }: { status: PostSummary["status"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[12px] font-medium",
        className,
      )}
    >
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: riverColor[status] }} />
      {text.status[status]}
    </span>
  )
}

/** Строка под графиком: где уровень относительно порогов, у поста без порогов — разброс за месяц */
function note(s: PostSummary): string {
  if (hasThresholds(s.post)) return levelPosition(s)
  const values = s.series.map((l) => l.level)
  return text.range(s.series.length, formatNumber(Math.min(...values)), formatNumber(Math.max(...values)))
}
