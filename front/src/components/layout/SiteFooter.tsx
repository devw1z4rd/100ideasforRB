import { ArrowRight, ArrowUp } from "lucide-react"
import { useInView } from "motion/react"
import { useRef, type ReactNode } from "react"
import { Link } from "react-router"
import { useAirUpdatedAt, useLatestAir } from "@/api/air"
import { useAirPoints } from "@/api/reference"
import { Container } from "@/components/layout/Container"
import { ThemeSwitch } from "@/components/layout/ThemeSwitch"
import { Tooltip } from "@/components/ui/tooltip"
import { anchors, cta, footer, pages, site } from "@/content/nav"
import { aqiCategory } from "@/lib/aqi"
import { formatRelativeTime } from "@/lib/format"
import { useNow } from "@/lib/useNow"
import { cn } from "@/lib/utils"

const year = new Date().getFullYear()
const exactTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" })
const navLink =
  "font-heading text-[17px] font-medium tracking-[-0.01em] underline decoration-transparent decoration-2 underline-offset-[5px] transition-colors hover:decoration-current md:text-[19px]"

export function SiteFooter() {
  const { data: latest } = useLatestAir()
  const { data: points } = useAirPoints()
  const { data: updated } = useAirUpdatedAt()
  const now = useNow()

  const ranked = latest
    ? [...latest.values()].filter((r) => r.us_aqi != null).sort((a, b) => b.us_aqi! - a.us_aqi!)
    : []
  const worst = ranked[0]
  const category = aqiCategory(worst?.us_aqi)
  const good = ranked.filter((r) => aqiCategory(r.us_aqi)?.level === "good").length
  const worstName = worst ? points?.find((p) => p.id === worst.point)?.name : undefined

  return (
    <footer
      data-aqi-footer={category?.level ?? "none"}
      className="mt-24 overflow-hidden bg-(--footer-bg) text-(--footer-ink) transition-colors duration-700 [main:has(>section:last-child)+&]:mt-8 md:[main:has(>section:last-child)+&]:mt-10"
    >
      <Container className="pt-14 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <h2 className="max-w-[16ch] font-heading text-[clamp(36px,5vw,76px)] leading-[0.98] font-semibold tracking-[-0.045em]">
              {footer.hook}
            </h2>
            <p className="mt-5 max-w-[54ch] text-base leading-[1.55] text-pretty">{footer.hookLead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={cta.to}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-(--footer-ink) px-6 text-[15px] font-medium text-(--footer-bg) transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--footer-ink)"
              >
                {cta.label}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to={{ pathname: "/", hash: footer.airLink.hash }}
                className="inline-flex h-12 items-center rounded-full border-2 border-(--footer-ink) px-6 text-[15px] font-medium transition-colors hover:bg-(--footer-ink) hover:text-(--footer-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--footer-ink)"
              >
                {footer.airLink.label}
              </Link>
            </div>
          </div>

          <nav
            aria-label="Разделы сайта"
            className="grid grid-cols-2 gap-8 lg:col-span-4 lg:col-start-9 lg:pt-3"
          >
            <FooterColumn title={footer.columns.home}>
              {anchors.map((a) => (
                <Link key={a.id} to={{ pathname: "/", hash: a.id }} className={navLink}>
                  {a.label}
                </Link>
              ))}
            </FooterColumn>
            <FooterColumn title={footer.columns.pages}>
              {pages.map((p) => (
                <Link key={p.to} to={p.to} className={navLink}>
                  {p.label}
                </Link>
              ))}
              <Link to={footer.data.to} className={navLink}>
                {footer.data.label}
              </Link>
            </FooterColumn>
          </nav>
        </div>

        {category && worst && (
          <section
            aria-label={footer.pulse.label}
            className="mt-14 grid gap-x-10 gap-y-6 border-t-2 border-(--footer-ink) pt-6 sm:grid-cols-3 md:mt-20"
          >
            <Pulse value={footer.pulse.good(good, ranked.length)} caption={footer.pulse.goodCaption} />
            <Pulse
              value={
                <>
                  {worstName ?? "—"} <span className="tabular-nums">· {Math.round(worst.us_aqi!)}</span>
                </>
              }
              caption={footer.pulse.worstCaption(category.label)}
            />
            {updated && (
              <Link to={footer.airUpdated.to} className="group block">
                <Pulse
                  value={
                    <Tooltip content={exactTime.format(updated)} side="top">
                      <time dateTime={updated.toISOString()} className="group-hover:underline">
                        {formatRelativeTime(updated, now)}
                      </time>
                    </Tooltip>
                  }
                  caption={footer.pulse.updatedCaption}
                />
              </Link>
            )}
          </section>
        )}

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-8 gap-y-4 text-[13px]",
            category ? "mt-10" : "mt-14 border-t-2 border-(--footer-ink) pt-6 md:mt-20",
          )}
        >
          <span>
            © {year} {site.name}
          </span>
          <div className="flex items-center gap-4">
            <ThemeSwitch className="[--background:var(--footer-ink)] [--foreground:var(--footer-bg)] [--input:var(--footer-ink)] [--muted-foreground:var(--footer-ink)] [--muted:color-mix(in_oklab,var(--footer-ink)_14%,transparent)]" />
            <Tooltip content={footer.toTop.label} side="top">
              <button
                type="button"
                aria-label={footer.toTop.label}
                onClick={() => window.scrollTo({ top: 0 })}
                className="grid size-10 cursor-pointer place-items-center rounded-full border-2 border-(--footer-ink) transition-colors hover:bg-(--footer-ink) hover:text-(--footer-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--footer-ink)"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </Container>

      <Wordmark text={footer.wordmark} />
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="border-b-2 border-(--footer-ink) pb-2 text-[13px] font-medium">{title}</p>
      <div className="mt-4 flex flex-col items-start gap-2.5">{children}</div>
    </div>
  )
}

function Pulse({ value, caption }: { value: ReactNode; caption: string }) {
  return (
    <div>
      <p className="font-heading text-[clamp(28px,3.2vw,48px)] leading-none font-semibold tracking-[-0.04em]">
        {value}
      </p>
      <p className="mt-2 max-w-[42ch] text-[13px] leading-snug first-letter:uppercase">{caption}</p>
    </div>
  )
}

function Wordmark({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useInView(ref, { once: true, margin: "0px 0px -15% 0px" })
  const letters = [...text]

  return (
    <div ref={ref} aria-hidden="true" className="@container mt-8 px-2 md:mt-12 md:px-4">
      <p
        data-shown={shown || undefined}
        className="wordmark flex justify-between overflow-hidden pb-[0.06em] font-heading text-[18.1cqw] leading-[0.86] font-semibold tracking-[-0.055em] select-none"
      >
        {letters.map((ch, i) => (
          <span key={i} className="wordmark-letter" style={{ transitionDelay: `${i * 55}ms` }}>
            <span className="wordmark-hop">{ch}</span>
          </span>
        ))}
      </p>
    </div>
  )
}
