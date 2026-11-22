import { isBelarusian, t } from "@/lib/locale"
import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

export function RouteErrorPage() {
  const error = useRouteError()
  useDocumentTitle(t("Ошибка", "Памылка"))
  const status = isRouteErrorResponse(error) ? error.status : undefined

  return (
    <Container className="py-24">
      <p className="text-[13px] font-medium text-muted-foreground">
        {status ? (isBelarusian ? `Памылка ${status}` : `Ошибка ${status}`) : t("Ошибка", "Памылка")}
      </p>
      <h1 className="mt-2 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {t("Что-то пошло не так", "Нешта пайшло не так")}
      </h1>
      <p className="mt-4 max-w-[60ch] text-muted-foreground">
        {t(
          "Страница не загрузилась. Обновите её или вернитесь на главную.",
          "Старонка не загрузілася. Абнавіце яе або вярніцеся на галоўную.",
        )}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => window.location.reload()}>
          {t("Обновить страницу", "Абнавіць старонку")}
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/">{t("На главную", "На галоўную")}</Link>
        </Button>
      </div>
    </Container>
  )
}
