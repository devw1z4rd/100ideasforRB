import { Menu } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { SectionId } from "@/content/home"
import { anchors, cta, login, pages } from "@/content/nav"

const item = "block rounded-md px-3 py-2 text-[15px] font-medium transition-colors hover:bg-muted"
const groupLabel = "px-3 pb-1 text-xs font-medium text-muted-foreground"

/** Навигация для экранов < 1024px: Sheet с якорями главной, страницами и входом. */
export function MobileNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<SectionId | null>(null)
  const navigate = useNavigate()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Меню" className={className}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        onCloseAutoFocus={(event) => {
          // Пока Sheet открыт, скролл страницы заблокирован — к секции переходим уже после закрытия
          if (!target) return
          event.preventDefault()
          navigate({ pathname: "/", hash: target })
          // Фокус — на заголовок секции, чтобы клавиатура и скринридер не потеряли место (а не на <body>).
          // Навигация завершается асинхронно, поэтому ждём появления заголовка (до ~1 с)
          const headingId = `${target}-title`
          let attempts = 0
          const focusHeading = () => {
            const heading = document.getElementById(headingId)
            if (heading) heading.focus({ preventScroll: true })
            else if (++attempts < 60) requestAnimationFrame(focusHeading)
          }
          requestAnimationFrame(focusHeading)
          setTarget(null)
        }}
      >
        <SheetHeader>
          <SheetTitle>Навигация</SheetTitle>
          <SheetDescription className="sr-only">Разделы главной и страницы сайта</SheetDescription>
        </SheetHeader>
        <nav aria-label="Навигация по сайту" className="flex flex-col gap-6 px-4 pb-6">
          <SheetClose asChild>
            <Button asChild size="lg" className="sm:hidden">
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          </SheetClose>
          <div>
            <p className={groupLabel}>На главной</p>
            {anchors.map((a) => (
              <a
                key={a.id}
                href={`/#${a.id}`}
                className={item}
                onClick={(event) => {
                  // Клик с модификатором — штатное поведение ссылки (новая вкладка/окно)
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
                    return
                  event.preventDefault()
                  setTarget(a.id)
                  setOpen(false)
                }}
              >
                {a.label}
              </a>
            ))}
          </div>
          <div>
            <p className={groupLabel}>Разделы</p>
            {pages.map((p) => (
              <SheetClose key={p.to} asChild>
                <Link to={p.to} className={item}>
                  {p.label}
                </Link>
              </SheetClose>
            ))}
          </div>
          <SheetClose asChild>
            <Link to={login.to} className={item}>
              {login.label}
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
