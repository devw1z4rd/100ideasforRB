import { ChevronDown, ShieldCheck } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router"
import { Container } from "@/components/layout/Container"
import { LogoMark } from "@/components/layout/Logo"
import { MobileNav } from "@/components/layout/MobileNav"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { anchorIds, anchors, cta, login as guestLogin, account, more, pages, site } from "@/content/nav"
import { useAuth } from "@/api/auth"
import { useReports, useReportsRealtime } from "@/api/reports"
import { moderationPage } from "@/content/reports"
import { useActiveSection } from "@/lib/activeSection"
import { useIndicator } from "@/lib/useIndicator"
import { cn } from "@/lib/utils"

const MORE_KEY = "more"

const NAV_DELAY_MS = 140
const NAV_STEP_MS = 50
const navDelay = (i: number) => ({ animationDelay: `${NAV_DELAY_MS + i * NAV_STEP_MS}ms` })

// No transition-colors; the indicator animates only translate (GPU). The active section changes mid-scroll,
// and main-thread animations relayout the long page every frame — janky on battery.
const navItem =
  "relative z-10 flex h-8 items-center rounded-lg px-3.5 text-sm font-medium whitespace-nowrap outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

export function SiteHeader() {
  const { user } = useAuth()
  const login = user ? account(user.name) : guestLogin
  const { pathname } = useLocation()
  const active = useActiveSection(anchorIds)
  const [target, setTarget] = useScrollTarget()
  const onHome = pathname === "/"
  const currentPage = pages.find((p) => pathname === p.to || pathname.startsWith(`${p.to}/`))
  const activeKey = onHome ? (target ?? active) : currentPage ? MORE_KEY : null

  const navRef = useRef<HTMLElement>(null)
  const pill = useIndicator(navRef, activeKey)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container className="grid h-14 grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center gap-x-4">
        <Link
          to="/"
          aria-label={`${site.name} — на главную`}
          className="col-start-1 flex items-center gap-2.5 justify-self-start"
        >
          <LogoMark />
          <SiteTitle section={onHome ? activeKey : null} />
        </Link>

        <nav
          ref={navRef}
          aria-label="Основная навигация"
          className="header-pop relative col-start-2 hidden items-center rounded-xl bg-muted p-1 lg:flex"
          style={{ animationDelay: "60ms" }}
        >
          {pill && (
            <span
              aria-hidden="true"
              className={cn(
                "header-fade absolute top-1 left-0 h-8 rounded-lg bg-background shadow-sm transition-[translate] duration-300 ease-out will-change-[translate] motion-reduce:transition-none dark:bg-input",
                !activeKey && "opacity-0",
              )}
              style={{ translate: `${pill.x}px 0`, width: pill.w, animationDelay: "220ms" }}
            />
          )}

          {anchors.map((a, i) => {
            const current = activeKey === a.id
            return (
              <Link
                key={a.id}
                data-nav-key={a.id}
                to={{ pathname: "/", hash: a.id }}
                aria-current={current ? "location" : undefined}
                className={cn(navItem, "header-rise", current ? "text-foreground" : "text-muted-foreground")}
                style={navDelay(i)}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  setTarget(a.id)
                }}
              >
                {a.label}
              </Link>
            )
          })}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              data-nav-key={MORE_KEY}
              className={cn(
                navItem,
                "header-rise group gap-1 data-[state=open]:text-foreground",
                currentPage ? "text-foreground" : "text-muted-foreground",
              )}
              style={navDelay(anchors.length)}
            >
              {more.label}
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-auto min-w-60 rounded-xl bg-muted p-1.5 shadow-lg ring-0"
            >
              {pages.map((p) => {
                const current = p === currentPage
                return (
                  <DropdownMenuItem
                    key={p.to}
                    asChild
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium focus:bg-background focus:text-foreground dark:focus:bg-input",
                      current ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Link to={p.to} aria-current={current ? "page" : undefined}>
                      {p.label}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator className="mx-2 bg-input xl:hidden" />
              <DropdownMenuItem
                asChild
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground focus:bg-background focus:text-foreground xl:hidden dark:focus:bg-input"
              >
                <Link to={login.to}>{login.label}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div
          className="header-slide col-start-3 flex items-center gap-2 justify-self-end"
          style={{ animationDelay: "260ms" }}
        >
          <ModerationLink />
          <Button asChild size="lg" className="hidden sm:inline-flex">
            <Link to={cta.to}>
              <span className="xl:hidden">{cta.shortLabel}</span>
              <span className="hidden xl:inline">{cta.label}</span>
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="hidden xl:inline-flex">
            <Link to={login.to}>{login.label}</Link>
          </Button>
          <MobileNav className="lg:hidden" activeSection={onHome ? active : null} />
        </div>
      </Container>
    </header>
  )
}

// The first home section (the map) is the top of the page: there the full name stays
const TITLE_TAILS = [site.region, ...anchors.slice(1).map((a) => `· ${a.label}`)]

/**
 * On the home page the tail of the name rolls, like a departures board, to the section in view: down the page
 * the old line leaves upward, back up it leaves downward. All tails share one grid cell, so the width stays that
 * of the full name and the nav capsule never shifts.
 */
function SiteTitle({ section }: { section: string | null }) {
  const index = Math.max(
    0,
    anchors.findIndex((a) => a.id === section),
  )
  return (
    <span className="flex items-baseline font-heading text-base font-semibold tracking-[-0.02em] whitespace-nowrap">
      {site.brand}&nbsp;
      <span className="grid overflow-hidden">
        {TITLE_TAILS.map((tail, i) => (
          <span
            key={tail}
            className="col-start-1 row-start-1 transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ translate: `0 ${Math.sign(i - index) * 100}%`, opacity: i === index ? 1 : 0 }}
          >
            {tail}
          </span>
        ))}
      </span>
    </span>
  )
}

function ModerationLink() {
  const { isModerator } = useAuth()
  if (!isModerator) return null
  return <ModerationCount />
}
function ModerationCount() {
  useReportsRealtime()
  const queue = useReports({ status: ["new"], duplicates: "exclude" })
  const n = queue.data?.length ?? 0
  return (
    <Button asChild size="lg" variant="outline" className="gap-2">
      <Link to="/moderation">
        <ShieldCheck />
        <span className="hidden md:inline">{moderationPage.link}</span>
        {n > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-background tabular-nums">
            {n}
          </span>
        )}
      </Link>
    </Button>
  )
}

const SCROLL_IDLE_MS = 1000

function useScrollTarget() {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!target) return
    const clear = () => setTarget(null)
    let idle = window.setTimeout(clear, SCROLL_IDLE_MS)
    const onScroll = () => {
      window.clearTimeout(idle)
      idle = window.setTimeout(clear, SCROLL_IDLE_MS)
    }
    const stop = ["scrollend", "wheel", "touchstart", "keydown"] as const
    window.addEventListener("scroll", onScroll, { passive: true })
    for (const type of stop) window.addEventListener(type, clear, { passive: true })
    return () => {
      window.clearTimeout(idle)
      window.removeEventListener("scroll", onScroll)
      for (const type of stop) window.removeEventListener(type, clear)
    }
  }, [target])

  return [target, setTarget] as const
}
