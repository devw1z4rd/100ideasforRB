import { Link, useMatches } from "react-router"
import { Container } from "@/components/layout/Container"
import { routeTitle } from "@/lib/routeTitle"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

/** Заглушка страниц §11, которые появятся в следующих подпроектах. */
export function StubPage() {
  const title = routeTitle(useMatches()) ?? "Раздел"
  useDocumentTitle(title)

  return (
    <Container className="py-24">
      <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {title}
      </h1>
      <p className="mt-4 text-muted-foreground">Раздел в разработке.</p>
      <Link
        to="/"
        className="mt-8 inline-block font-medium text-link transition-colors hover:text-link-hover"
      >
        ← На главную
      </Link>
    </Container>
  )
}
