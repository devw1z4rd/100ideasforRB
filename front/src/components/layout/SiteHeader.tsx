import { ChevronDown } from "lucide-react"
import { Link, NavLink, useLocation } from "react-router"
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
import { anchorIds, anchors, cta, login, pages, site } from "@/content/nav"
import { useActiveSection } from "@/lib/activeSection"
import { cn } from "@/lib/utils"

const navItem =
  "flex h-14 items-center px-3 text-sm font-medium whitespace-nowrap transition-colors hover:text-foreground"

/**
 * Sticky-шапка (CLAUDE.md §10.2). Сжатие по ширине:
 * < 1024 — логотип, CTA (с 640) и бургер; 1024–1279 — якоря, «Ещё» (страницы + вход), короткая CTA;
 * 1280–1535 — плюс полная CTA и «Войти»; ≥ 1536 — страницы в строку вместо «Ещё».
 */
export function SiteHeader() {
  const { pathname } = useLocation()
  const active = useActiveSection(anchorIds)
  const onHome = pathname === "/"

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container className="flex h-14 items-center gap-x-4">
        <Link
          to="/"
          aria-label={`${site.name} — на главную`}
          className="mr-5 flex shrink-0 items-center gap-2.5"
        >
          <LogoMark />
          <span className="font-heading text-base font-semibold tracking-[-0.02em] whitespace-nowrap">
            {site.name}
          </span>
        </Link>

        <nav aria-label="Разделы главной" className="hidden lg:flex">
          {anchors.map((a) => {
            const current = onHome && active === a.id
            return (
              <Link
                key={a.id}
                to={{ pathname: "/", hash: a.id }}
                aria-current={current ? "location" : undefined}
                className={cn(
                  navItem,
                  current
                    ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                    : "text-muted-foreground",
                )}
              >
                {a.label}
              </Link>
            )
          })}
        </nav>

        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-input lg:block" />

        <nav aria-label="Страницы сайта" className="hidden 2xl:flex">
          {pages.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              className={({ isActive }) =>
                cn(navItem, isActive ? "text-foreground" : "text-muted-foreground")
              }
            >
              {p.label}
            </NavLink>
          ))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(navItem, "hidden gap-1 text-muted-foreground lg:flex 2xl:hidden")}
          >
            Ещё
            <ChevronDown aria-hidden="true" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {pages.map((p) => (
              <DropdownMenuItem key={p.to} asChild>
                <Link to={p.to}>{p.label}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="xl:hidden" />
            <DropdownMenuItem asChild className="xl:hidden">
              <Link to={login.to}>{login.label}</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
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
