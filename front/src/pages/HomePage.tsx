import { Container } from "@/components/layout/Container"
import { site } from "@/content/nav"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

export function HomePage() {
  useDocumentTitle()

  return (
    <Container className="py-24">
      <h1 className="font-heading text-5xl font-semibold tracking-[-0.04em]">{site.title}</h1>
    </Container>
  )
}
