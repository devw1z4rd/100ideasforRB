import { enterprises as text } from "@/content/enterprises"
import { cn } from "@/lib/utils"

const s = text.sources

/**
 * Основные источники загрязнения в области (§10.7) — перечень из стратегии области, без долей (они не
 * публикуются) и без смены по годам. Поэтому не карточкой в сетке, а тихой строкой под ней: на десктопе шесть
 * колонок в одну линию, на телефоне — по две.
 */
export function MainSources({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h3 className="text-sm leading-5 font-semibold">{s.title}</h3>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
        {s.items.map((i) => (
          <li key={i.name} className="flex min-w-0 flex-col border-l-2 border-border pl-3">
            <span className="text-sm leading-5 font-medium wrap-anywhere">{i.name}</span>
            <span className="text-[13px] leading-[18px] text-muted-foreground">
              {i.what} · {i.where}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
