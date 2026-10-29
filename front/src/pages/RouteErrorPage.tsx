import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

/** errorElement маршрутов: ошибка рендера или загрузки данных — сообщение на русском вместо экрана React Router. */
export function RouteErrorPage() {
  const error = useRouteError()
  useDocumentTitle("Ошибка")
  const status = isRouteErrorResponse(error) ? error.status : undefined

  return (
    <Container className="py-24">
      <p className="text-[13px] font-medium text-muted-foreground">
        {status ? `Ошибка ${status}` : "Ошибка"}
      </p>
      <h1 className="mt-2 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        Что-то пошло не так
      </h1>
      <p className="mt-4 max-w-[60ch] text-muted-foreground">
        Страница не загрузилась. Обновите её или вернитесь на главную.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/">На главную</Link>
        </Button>
      </div>
    </Container>
  )
}
