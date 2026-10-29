import { Link } from "react-router"
import { useAirUpdatedAt } from "@/api/air"
import { footer } from "@/content/nav"
import { formatRelativeTime } from "@/lib/format"
import { useNow } from "@/lib/useNow"

const exactTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" })

/** «Воздух: обновлено 14 минут назад» — когда cron последний раз записал данные. Пока данных нет — ничего. */
export function AirFreshness({ className }: { className?: string }) {
  const { data: updated } = useAirUpdatedAt()
  const now = useNow()
  if (!updated) return null

  return (
    <Link to={footer.airUpdated.to} className={className}>
      {footer.airUpdated.label}{" "}
      <time dateTime={updated.toISOString()} title={exactTime.format(updated)}>
        {formatRelativeTime(updated, now)}
      </time>
    </Link>
  )
}
