import { Link } from "react-router"
import { Container } from "@/components/layout/Container"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

export function NotFoundPage() {
  useDocumentTitle("Страница не найдена")

  return (
    <Container className="py-24">
      <p className="text-[13px] font-medium text-muted-foreground">Ошибка 404</p>
      <h1 className="mt-2 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        Страница не найдена
      </h1>
      <Link
        to="/"
        className="mt-8 inline-block font-medium text-link transition-colors hover:text-link-hover"
      >
        ← На главную
      </Link>
    </Container>
  )
}
