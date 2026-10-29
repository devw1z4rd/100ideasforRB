import { Link } from "react-router"
import { AirFreshness } from "@/components/layout/AirFreshness"
import { Container } from "@/components/layout/Container"
import { footer, site } from "@/content/nav"

const link = "transition-colors hover:text-foreground"
const year = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-8 text-[13px] text-muted-foreground">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>
            © {year} {site.name}
          </span>
          <AirFreshness className={link} />
        </div>
        <nav aria-label="Служебные ссылки" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to={footer.data.to} className={link}>
            {footer.data.label}
          </Link>
          <a href={footer.admin.href} className={link}>
            {footer.admin.label}
          </a>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0 })}
            className={`${link} cursor-pointer`}
          >
            {footer.toTop.label}
          </button>
        </nav>
      </Container>
    </footer>
  )
}
