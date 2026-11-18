import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { PageTip, StaticPage } from "./static"
import { water as text } from "@/content/water"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { cn } from "@/lib/utils"
import { byIndicator, exceedances, quarterLabel, quarters, sections, type Reading } from "@/lib/water"
import {
  ExceedancesPage,
  GlossaryPage,
  HydrologyPage,
  ratioScale,
  SummaryPage,
  TemperaturePage,
  type ReportData,
} from "./chapters"
import { CoverFront, CoverShade, Endpaper, PageEdges, seasonStyle } from "./Cover"
import { Leaf } from "./Leaf"

const r = text.report
// Строк точечного графика на страницу: больше — глава продолжается на следующей странице
const ROWS_PER_PAGE = 12

type ChapterKey = keyof typeof r.chapters
/** Страница разворота: глава (у длинной главы — несколько частей), левая и правая страницы */
type Page = {
  chapter: ChapterKey
  title: string
  text: string
  part?: { n: number; total: number }
  left?: ReactNode
  right: ReactNode
}

/** Данные квартала для книжки */
export function buildReport(rows: readonly Reading[], quarter: string): ReportData & { sourceUrl?: string } {
  const label = quarterLabel(quarter)
  return {
    label,
    exceedances: exceedances(rows, quarter),
    sections: sections(rows, quarter),
    // Сначала водность рек за квартал, потом отдельные события у городов
    hydrology: [...byIndicator(rows, quarter, "hydrology")].sort(
      (a, b) => Number(!!a.section) - Number(!!b.section),
    ),
    temperature: byIndicator(rows, quarter, "temperature"),
    sourceUrl: rows.find((x) => x.quarter === quarter && x.sourceUrl)?.sourceUrl,
  }
}

// enter — на месте книжки на полке (прозрачная), fly — перелёт в центр, closed — закрыта в центре,
// opening / open — обложка открывается / открыта, unread — гаснет текст левой страницы перед закрытием,
// closing — обложка закрывается, leave — перелёт на полку, land — перетекание в книжку полки
type Phase = "enter" | "fly" | "closed" | "opening" | "open" | "unread" | "closing" | "leave" | "land"

/**
 * Книжка квартального обзора в модальном окне (§10.8). Десктоп: книжка вылетает с полки (origin — её кнопка)
 * в центр, страница сзади размывается; обложка переворачивается влево и становится левой страницей, книжка
 * съезжает к центру разворота. Закрытие — в обратном порядке, книжка возвращается на полку. Смена страницы —
 * лист с изгибом (Leaf). ← → листают, Esc и щелчок мимо книжки закрывают.
 * Телефон и планшет: окно во весь экран, страницы друг под другом, без перелёта.
 */
export function ReportDialog({
  rows,
  quarter,
  origin,
  onLand,
  onDone,
}: {
  rows: readonly Reading[]
  quarter: string
  /** Кнопка книжки на полке: откуда вылетает и куда возвращается */
  origin: RefObject<HTMLElement | null>
  /** Книжка долетела до полки: полка проявляет свою книжку, летевшая гаснет */
  onLand: () => void
  onDone: () => void
}) {
  const desktop = useMediaQuery("(min-width: 1024px)")
  const data = useMemo(() => buildReport(rows, quarter), [rows, quarter])
  const [open, setOpen] = useState(true)
  const [phase, setPhase] = useState<Phase>(desktop ? "enter" : "open")
  const [index, setIndex] = useState(0)
  // Перелистывание: с какой страницы на какую. Пока лист летит, страницы под ним показывают нужные стороны
  const [turn, setTurn] = useState<{ id: number; dir: "next" | "prev"; from: number; to: number } | null>(
    null,
  )
  // После первого перелистывания страницы появляются уже «напечатанными» — без анимации строк
  const [turned, setTurned] = useState(false)
  const [river, setRiver] = useState<string | null>(null)
  // Размер книжки на полке (без наведения): обложка в окне — та же вёрстка, увеличенная, поэтому в точке взлёта
  // и посадки летящая книжка совпадает с книжкой полки и подмена не видна
  const [shelf] = useState(() => {
    const el = origin.current
    return el && el.offsetWidth ? { w: el.offsetWidth, h: el.offsetHeight } : null
  })
  // Книжка на полке под курсором приоткрыта: летящая стартует с той же обложкой (угол — из её transform,
  // в том числе посреди перехода) и открывается дальше с него
  const [ajar] = useState(() => coverAngle(origin.current?.querySelector("[data-book-cover]")))
  const size = useBookSize(shelf ? shelf.h / shelf.w : 4 / 3)
  const latest = useMemo(() => quarters(rows).at(-1), [rows])
  const headingRef = useRef<HTMLHeadingElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Страницы: длинный список отклонений делится на части
  const rivers = [...new Set(data.exceedances.map((e) => e.river))]
  const shown = river ? data.exceedances.filter((e) => e.river === river) : data.exceedances
  const scale = ratioScale(data.exceedances[0]?.ratio ?? 1)
  const riverWater = data.hydrology.filter((h) => !h.section)
  const townLevels = data.hydrology.filter((h) => h.section)
  const used = new Set(data.exceedances.map((e) => e.indicator))
  const parts = Math.max(1, Math.ceil(shown.length / ROWS_PER_PAGE))
  const pages: Page[] = [
    { chapter: "summary", ...r.chapters.summary, right: <SummaryPage data={data} /> },
    ...(data.exceedances.length
      ? Array.from({ length: parts }, (_, k): Page => ({
          chapter: "exceedances",
          ...r.chapters.exceedances,
          part: parts > 1 ? { n: k + 1, total: parts } : undefined,
          left: <RiverChips rivers={rivers} value={river} onChange={setRiver} />,
          right: (
            <ExceedancesPage items={shown.slice(k * ROWS_PER_PAGE, (k + 1) * ROWS_PER_PAGE)} scale={scale} />
          ),
        }))
      : []),
    ...(riverWater.length
      ? [
          {
            chapter: "hydrology" as const,
            ...r.chapters.hydrology,
            right: <HydrologyPage items={riverWater} />,
          },
        ]
      : []),
    ...(townLevels.length
      ? [{ chapter: "levels" as const, ...r.chapters.levels, right: <HydrologyPage items={townLevels} /> }]
      : []),
    ...(data.temperature.length
      ? [
          {
            chapter: "temperature" as const,
            ...r.chapters.temperature,
            right: <TemperaturePage items={data.temperature} />,
          },
        ]
      : []),
    {
      chapter: "glossary",
      ...r.chapters.glossary,
      right: <GlossaryPage label={data.label} sourceUrl={data.sourceUrl} used={used} />,
    },
  ]
  const at = Math.min(index, pages.length - 1)
  // Оглавление — главы, у каждой первая страница
  const toc = pages.flatMap((p, i) =>
    pages.findIndex((q) => q.chapter === p.chapter) === i ? [{ ...p, at: i }] : [],
  )
  const chapterOf = (pg: Page) => toc.findIndex((c) => c.chapter === pg.chapter)
  const clamp = (i: number) => Math.min(Math.max(i, 0), pages.length - 1)

  const go = (to: number) => {
    if (to < 0 || to >= pages.length || to === at) return
    if (desktop) {
      // Лист ещё летит — следующий после него
      if (turn) return
      setTurned(true)
      setTurn({ id: Date.now(), dir: to > at ? "next" : "prev", from: at, to })
    }
    // Телефон: страницы друг под другом — новую главу показываем с начала
    else contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    setIndex(to)
  }

  // К этому моменту книжка полки уже видна, а летевшая погасла — окно убирается без мерцания
  const finish = useCallback(() => {
    setOpen(false)
    setTimeout(onDone, 0)
  }, [onDone])
  const land = useCallback(() => {
    setPhase("land")
    onLand()
  }, [onLand])

  const requestClose = () => {
    if (!desktop) return finish()
    if (phase === "open") setPhase("unread")
    else if (phase === "opening") setPhase("closing")
    else if (phase === "enter" || phase === "fly" || phase === "closed") setPhase("leave")
  }

  // Перелёт с полки: первый кадр — на месте книжки на полке, со следующего она летит в центр и уже раскрывается
  // в полёте (без остановки закрытой в центре)
  useEffect(() => {
    if (phase !== "enter") return
    let id = requestAnimationFrame(() => (id = requestAnimationFrame(() => setPhase("opening"))))
    return () => cancelAnimationFrame(id)
  }, [phase])
  // Закрытая книжка в центре — короткая пауза и открываем
  useEffect(() => {
    if (phase !== "closed") return
    const t = setTimeout(() => setPhase("opening"), 120)
    return () => clearTimeout(t)
  }, [phase])
  // Перед закрытием текст левой страницы гаснет, потом обложка закрывается
  useEffect(() => {
    if (phase !== "unread") return
    const t = setTimeout(() => setPhase("closing"), 200)
    return () => clearTimeout(t)
  }, [phase])
  // Подстраховка, если transitionend не придёт (вкладка в фоне, reduced motion)
  useEffect(() => {
    const next: Partial<Record<Phase, () => void>> = {
      fly: () => setPhase("closed"),
      opening: () => setPhase("open"),
      closing: () => setPhase("leave"),
      leave: land,
      land: finish,
    }
    const step = next[phase]
    if (!step) return
    const t = setTimeout(step, 1500)
    return () => clearTimeout(t)
  }, [phase, finish, land])
  useEffect(() => {
    if (phase === "open") headingRef.current?.focus({ preventScroll: true })
  }, [phase])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (phase !== "open") return
    if (e.key === "ArrowRight") go(at + 1)
    else if (e.key === "ArrowLeft") go(at - 1)
    else return
    e.preventDefault()
  }

  const leftPage = (i: number, real: boolean) => (
    <LeftPage
      // Гаснет только при смене главы: между частями одной главы текст слева тот же
      turning={
        real && turn && pages[clamp(turn.from)].chapter !== pages[clamp(turn.to)].chapter ? turn : null
      }
      visible={!desktop || phase === "open"}
      page={pages[i]}
      toc={toc}
      chapterNo={chapterOf(pages[i])}
      label={data.label}
      headingRef={real ? headingRef : undefined}
      animate={!desktop}
      onGo={go}
    />
  )
  const rightPage = (i: number) => (
    <RightPage
      page={pages[i]}
      at={i}
      total={pages.length}
      animate={!desktop}
      still={turned}
      onGo={go}
      onClose={requestClose}
    />
  )
  // Как в книге: вперёд слева остаётся старая страница, пока на неё не ляжет лист с новой (новое не появляется
  // раньше листа), справа под листом уже новая — лист её открывает. Назад — наоборот: слева под листом уже
  // новая, справа старая, пока на неё не ляжет лист. Номер главы — только слева, он меняется один раз: когда
  // лист ложится (вперёд) или открывает страницу (назад). Лист ложится на такую же страницу — исчезновение не видно
  const leftAt = turn ? clamp(turn.dir === "next" ? turn.from : turn.to) : at
  const rightAt = turn ? clamp(turn.dir === "next" ? turn.to : turn.from) : at
  const left = leftPage(leftAt, true)
  const right = rightPage(rightAt)

  // Положение книжки: на полке (перелёт), закрыта в центре (обложка по центру экрана) или раскрыта
  const { P, H } = size
  const flipped = phase === "opening" || phase === "open" || phase === "unread"
  const bookTransform = (): string | undefined => {
    if (phase === "enter" || phase === "leave" || phase === "land") {
      const el = origin.current
      const o = el?.getBoundingClientRect()
      if (!o) return undefined
      const tx = o.left + o.width / 2 - window.innerWidth / 2 - P / 2
      const ty = o.top + o.height / 2 - window.innerHeight / 2
      const w = el?.offsetWidth || o.width
      return `translate(${tx}px, ${ty}px) scale(${w / P})`
    }
    return flipped ? "translateX(0)" : `translateX(${-P / 2}px)`
  }
  // Перелёт с полки и на полку — с перетеканием: книжки на полке и в полёте свёрстаны по-разному
  const bookTransition =
    phase === "fly"
      ? "transform 620ms cubic-bezier(0.2, 0.8, 0.2, 1)"
      : phase === "opening"
        ? // Полёт чуть короче оборота обложки (1100 мс): книжка прилетает, обложка дораскрывается на месте
          "transform 900ms cubic-bezier(0.3, 0.7, 0.2, 1), perspective-origin 900ms cubic-bezier(0.3, 0.7, 0.2, 1)"
        : phase === "closing"
          ? "transform 1100ms cubic-bezier(0.45, 0.05, 0.2, 1), perspective-origin 1100ms cubic-bezier(0.45, 0.05, 0.2, 1)"
          : phase === "leave"
            ? "transform 560ms cubic-bezier(0.4, 0, 0.2, 1)"
            : phase === "land"
              ? "opacity 160ms ease-in"
              : "none"
  const leftVisible = phase === "open" || phase === "unread"
  // Правая страница до раскрытия — только бумага: её видно в щель приоткрытой обложки, текст появляется с раскрытием
  const paperOnly = phase !== "opening" && !leftVisible && phase !== "closing"
  // Обложка: раскрыта; приоткрыта, как была на полке (пока летит и ждёт в центре); закрыта
  const coverTurn = flipped ? -180 : phase === "enter" || phase === "fly" || phase === "closed" ? ajar : 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/40 backdrop-blur-[6px] transition-opacity duration-500 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
            (phase === "leave" || phase === "land") && "opacity-0",
          )}
        />
        <DialogPrimitive.Content
          ref={contentRef}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            bookRef.current?.focus({ preventScroll: true })
          }}
          // Фокус на книжку полки возвращает WaterShelf, когда она снова видна (скрытая фокус не примет)
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            requestClose()
          }}
          // Щелчок мимо книжки — закрыть
          onPointerDown={(e) => e.target === e.currentTarget && requestClose()}
          onKeyDown={onKeyDown}
          style={seasonStyle(quarter)}
          className={cn(
            "fixed inset-0 z-50 outline-none",
            desktop ? "grid place-items-center overflow-hidden" : "overflow-y-auto px-3 py-4 sm:px-6 sm:py-8",
          )}
        >
          <DialogPrimitive.Title className="sr-only">{r.dialogTitle(data.label)}</DialogPrimitive.Title>

          {/* Телефон и планшет: окно прокручивается, кнопка закрытия всегда в углу */}
          {!desktop && (
            <div className="pointer-events-none sticky top-0 z-20 flex h-0 justify-end">
              <button
                type="button"
                aria-label={r.close}
                onClick={requestClose}
                className="pointer-events-auto grid size-11 cursor-pointer place-items-center rounded-full bg-background text-foreground shadow-md focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
          )}

          {desktop ? (
            <div
              ref={bookRef}
              tabIndex={-1}
              onTransitionEnd={(e) => {
                if (e.target !== e.currentTarget) return
                if (e.propertyName === "transform" && phase === "fly") setPhase("closed")
                else if (e.propertyName === "transform" && phase === "leave") land()
                else if (e.propertyName === "opacity" && phase === "land") finish()
              }}
              className="relative grid grid-cols-2 outline-none"
              style={{
                width: 2 * P,
                height: H,
                transformOrigin: "75% 50%",
                transform: bookTransform(),
                transition: bookTransition,
                // Глаз — в центре экрана: над закрытой книжкой (центр правой половины), над раскрытой — над корешком.
                // Перспектива — 4 ширины страницы, как у книжки на полке (400cqw): приоткрытая обложка совпадает
                perspective: 4 * P,
                perspectiveOrigin: flipped ? "50% 50%" : "75% 50%",
                // Посадка: книжка полки уже видна под летящей (они одинаковые) — летящая просто гаснет
                opacity: phase === "land" ? 0 : 1,
              }}
            >
              {/* Левая половина — изнанка обложки, когда книжка раскрыта */}
              <div className="relative min-w-0">
                {/* Фон страницы — сразу (он такой же, как изнанка обложки под ним), проявляется только текст */}
                {leftVisible && <div className="absolute inset-0">{left}</div>}
              </div>

              {/* Правая страница — бумага; под обложкой — стопка листов */}
              <div className="relative min-w-0 [perspective-origin:0%_50%] [perspective:2600px]">
                <PageEdges />
                <div
                  className={cn(
                    "absolute inset-0 overflow-hidden rounded-r-xl bg-book-paper",
                    !paperOnly && "shadow-[0_30px_70px_-30px_var(--book-shadow)]",
                  )}
                >
                  <CoverShade
                    className="transition-opacity duration-500"
                    style={{ opacity: paperOnly && coverTurn < 0 ? 1 : 0 }}
                  />
                  {/* Текст скрыт, но смонтирован: его анимации появления отыгрывают, пока книжка летит */}
                  <div className={cn("absolute inset-0", paperOnly && "invisible")}>
                    {/* Тень корешка */}
                    <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-[linear-gradient(90deg,rgb(0_0_0/0.12),transparent)]" />
                    {right}
                  </div>
                </div>
                {turn && (
                  <Leaf
                    key={turn.id}
                    dir={turn.dir}
                    width={P}
                    // Лицо — правая страница: вперёд та, с которой уходим, назад — та, на которую приходим
                    front={
                      <div className="relative h-full bg-book-paper">
                        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-[linear-gradient(90deg,rgb(0_0_0/0.12),transparent)]" />
                        {rightPage(clamp(turn.dir === "next" ? turn.from : turn.to))}
                      </div>
                    }
                    // Изнанка — левая страница: вперёд новая (её лист и приносит), назад — та, с которой уходим
                    back={leftPage(clamp(turn.dir === "next" ? turn.to : turn.from), false)}
                    onDone={() => setTurn(null)}
                  />
                )}
              </div>

              {/* Обложка: лицо — обложка обзора, изнанка — форзац, он ложится на левую половину */}
              <div
                aria-hidden="true"
                onTransitionEnd={(e) => {
                  if (e.target !== e.currentTarget || e.propertyName !== "transform") return
                  if (phase === "opening") setPhase("open")
                  else if (phase === "closing") setPhase("leave")
                }}
                className={cn(
                  "absolute top-0 right-0 z-30 h-full w-1/2 origin-left [transform-style:preserve-3d]",
                  leftVisible && "invisible",
                )}
                style={{
                  transform: coverTurn ? `rotateY(${coverTurn}deg)` : undefined,
                  transition:
                    phase === "opening" || phase === "closing"
                      ? "transform 1100ms cubic-bezier(0.45, 0.05, 0.2, 1)"
                      : phase === "leave"
                        ? "transform 560ms cubic-bezier(0.4, 0, 0.2, 1)"
                        : undefined,
                }}
              >
                <span className="absolute inset-0 [backface-visibility:hidden]">
                  {shelf ? (
                    // Вёрстка книжки полки, увеличенная до страницы окна
                    <span
                      className="absolute top-0 left-0 origin-top-left"
                      style={{ width: shelf.w, height: shelf.h, transform: `scale(${P / shelf.w})` }}
                    >
                      <CoverFront
                        label={data.label}
                        sections={data.sections}
                        withIssues={data.sections.filter((x) => x.worst > 1).length}
                        size="shelf"
                        badge={quarter === latest ? r.shelf.newBadge : undefined}
                      />
                    </span>
                  ) : (
                    <CoverFront
                      label={data.label}
                      sections={data.sections}
                      withIssues={data.sections.filter((x) => x.worst > 1).length}
                      size="book"
                    />
                  )}
                </span>
                <span className="absolute inset-0 [transform:rotateY(180deg)] overflow-hidden rounded-l-xl bg-book-cover [backface-visibility:hidden]">
                  <Endpaper />
                </span>
              </div>
            </div>
          ) : (
            <div
              ref={bookRef}
              tabIndex={-1}
              className="book-open-in mx-auto max-w-xl overflow-hidden rounded-xl shadow-[0_24px_60px_-24px_var(--book-shadow)] outline-none"
            >
              {left}
              <div className="bg-book-paper">{right}</div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Размер страницы: почти вся высота окна (до 920 px) и пропорции книжки на полке (ratio = высота / ширина),
 * разворот — с полями по бокам. На ноутбуке 1366 × 768 — около 528 × 704, на Full HD — 672 × 896.
 */
function useBookSize(ratio: number) {
  const measure = () => {
    const maxH = Math.min(920, window.innerHeight - 64)
    const P = Math.min(Math.floor(maxH / ratio), Math.floor((window.innerWidth - 96) / 2))
    return { P, H: Math.round(P * ratio) }
  }
  const [size, setSize] = useState(measure)
  useEffect(() => {
    const onResize = () => setSize(measure())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [ratio])
  return size
}

/** Левая страница: глава, пояснение, элементы главы и оглавление внизу */
function LeftPage({
  turning,
  visible,
  page,
  toc,
  chapterNo,
  label,
  headingRef,
  animate,
  onGo,
}: {
  /** Лист над страницей: текст гаснет (вперёд) или проявляется после него (назад) — один номер главы за раз */
  turning: { id: number; dir: "next" | "prev" } | null
  /** Текст виден: проявляется после появления страницы и гаснет перед закрытием книжки */
  visible: boolean
  page: Page
  toc: ReadonlyArray<Page & { at: number }>
  chapterNo: number
  label: string
  /** Только у настоящей страницы: на неё переходит фокус. У отпечатка на листе — нет */
  headingRef?: RefObject<HTMLHeadingElement | null>
  /** Смена главы — проявлением (телефон). На десктопе главу приносит лист: проявление после него мигнуло бы */
  animate: boolean
  onGo: (to: number) => void
}) {
  const isStatic = useContext(StaticPage)
  // Первый кадр — прозрачный текст, следующий — видимый: переход opacity проявляет его
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-book-cover px-7 py-7 text-book-cover-ink lg:rounded-l-xl lg:px-10 lg:py-9">
      <Endpaper />
      <div
        // Новый ключ на каждое перелистывание — анимация запускается заново
        key={turning?.id ?? "still"}
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
          turning && (turning.dir === "next" ? "book-left-out" : "book-left-in"),
        )}
        style={
          isStatic ? undefined : { opacity: mounted && visible ? 1 : 0, transition: "opacity 260ms ease" }
        }
      >
        <p className="relative text-[11px] font-medium tracking-[0.12em] text-book-cover-muted uppercase">
          {text.quality.title} · {label}
        </p>

        <div key={page.chapter} className={cn("relative mt-6 lg:mt-10", animate && "book-fade-in")}>
          <p className="flex items-center gap-2.5 text-[13px] text-book-cover-muted">
            {r.chapterShort}
            <span className="grid size-7 place-items-center rounded-full bg-book-cover-ink font-heading text-[14px] font-semibold text-book-cover tabular-nums">
              {chapterNo + 1}
            </span>
          </p>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 font-heading text-[clamp(30px,3.2vw,44px)] leading-[1.02] font-semibold tracking-[-0.035em] outline-none"
          >
            {page.title}
          </h3>
          <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.6] text-book-cover-ink/85">{page.text}</p>
          {page.part && (
            <p className="mt-3 text-[12px] font-medium text-book-cover-muted first-letter:uppercase">
              {r.part(page.part.n, page.part.total)}
            </p>
          )}
          {page.left && <div className="mt-5">{page.left}</div>}
        </div>

        {/* Оглавление — как в книге: номер, глава; текущая подсвечена */}
        <nav aria-label={r.contents} className="relative mt-8 lg:mt-auto">
          <ol className="border-t border-book-cover-ink/20">
            {toc.map((c, i) => (
              <li key={c.chapter}>
                <button
                  type="button"
                  aria-current={i === chapterNo ? "step" : undefined}
                  onClick={() => onGo(c.at)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 border-b border-book-cover-ink/20 py-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-book-cover-ink",
                    i === chapterNo ? "font-semibold" : "text-book-cover-muted hover:text-book-cover-ink",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[11px] tabular-nums transition-colors",
                      i === chapterNo ? "bg-book-cover-ink text-book-cover" : "bg-book-cover-ink/15",
                    )}
                  >
                    {i + 1}
                  </span>
                  {c.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  )
}

/** Правая страница: закрыть, содержимое, листание и номер страницы. Номер главы — только на левой */
function RightPage({
  page,
  at,
  total,
  animate,
  still,
  onGo,
  onClose,
}: {
  page: Page
  at: number
  total: number
  /** Смена страницы — проявлением (телефон); на десктопе страницу открывает лист */
  animate: boolean
  /** Без анимации строк: страница открыта листанием и уже «напечатана» */
  still: boolean
  onGo: (to: number) => void
  onClose: () => void
}) {
  const last = at === total - 1
  return (
    <div className="flex h-full flex-col px-6 py-6 lg:px-10 lg:py-8">
      <div className="flex items-center justify-end gap-4">
        <PageTip content={r.close}>
          <button
            type="button"
            aria-label={r.close}
            onClick={onClose}
            // Телефон и планшет: страницы идут друг под другом, и кнопка оказалась бы посреди экрана —
            // там её заменяет кнопка, закреплённая в углу окна (ReportDialog)
            className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring max-lg:hidden"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </PageTip>
      </div>

      <div
        key={`${page.chapter}-${page.part?.n ?? 1}`}
        className={cn(
          "mt-3 min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto pr-1",
          animate && "book-page-in",
          still && "book-static",
        )}
      >
        {page.right}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-[13px]">
        <button
          type="button"
          onClick={() => onGo(at - 1)}
          disabled={at === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 font-medium transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {r.prev}
        </button>
        <span className="text-[11px] text-muted-foreground tabular-nums">{r.page(at + 1)}</span>
        <button
          type="button"
          onClick={() => (last ? onClose() : onGo(at + 1))}
          className="inline-flex cursor-pointer items-center gap-1.5 font-medium transition-opacity hover:opacity-70"
        >
          {last ? r.close : r.next}
          {last ? (
            <X aria-hidden="true" className="size-4" />
          ) : (
            <ArrowRight aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
    </div>
  )
}

/** Фильтр по рекам в главе «Где вода хуже нормы» — на левой странице, в цветах обложки */
function RiverChips({
  rivers,
  value,
  onChange,
}: {
  rivers: readonly string[]
  value: string | null
  onChange: (river: string | null) => void
}) {
  return (
    <div role="radiogroup" aria-label="Река" className="flex flex-wrap gap-1.5">
      {[null, ...rivers].map((rv) => (
        <button
          key={rv ?? "all"}
          type="button"
          role="radio"
          aria-checked={value === rv}
          onClick={() => onChange(rv)}
          className={cn(
            "h-7 cursor-pointer rounded-full px-3 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-book-cover-ink",
            value === rv
              ? "bg-book-cover-ink font-medium text-book-cover"
              : "bg-book-cover-ink/12 text-book-cover-ink hover:bg-book-cover-ink/20",
          )}
        >
          {rv ?? text.plot.all}
        </button>
      ))}
    </div>
  )
}

/** Угол поворота обложки книжки на полке вокруг корешка (rotateY), градусы; 0 — закрыта или не найдена */
function coverAngle(el: Element | null | undefined): number {
  if (!el) return 0
  const t = getComputedStyle(el).transform
  if (!t || t === "none") return 0
  // rotateY(θ): m11 = cos θ, m31 = sin θ
  const m = new DOMMatrixReadOnly(t)
  return Math.round(((Math.atan2(m.m31, m.m11) * 180) / Math.PI) * 10) / 10
}
