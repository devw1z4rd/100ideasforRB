import { hero } from "@/content/hero"
import { cn } from "@/lib/utils"

/**
 * Заголовок главной: белым в верхней строке тёмной панели карты (MapSection), рядом с чипами слоёв.
 * Прежний hero над картой — надпись, вводный абзац с фактами, их источники и мета-блок «Источники →
 * Данные и методика» — временно скрыт: данные в content/hero.ts, разметка — в комментарии ниже.
 */
export function Hero({ className }: { className?: string }) {
  return (
    <h1
      id="hero-title"
      className={cn(
        "font-heading text-[clamp(32px,3.6vw,56px)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance text-foreground",
        className,
      )}
    >
      {hero.title}
    </h1>
  )
}

// Прежняя разметка hero (была отдельной секцией над картой, в Container):
//
// /** Делит lead по плейсхолдерам {key} и подставляет выделенные факты. */
// function renderLead(lead: string, facts: Record<string, HeroFact>) {
//   return lead.split(/(\{\w+\})/).map((part, i) => {
//     const fact = part.startsWith("{") ? facts[part.slice(1, -1)] : undefined
//     if (!fact) return <Fragment key={i}>{part}</Fragment>
//     return (
//       <span key={i} className="font-medium text-foreground tabular-nums">
//         {fact.format}
//       </span>
//     )
//   })
// }
//
// <p className="text-[13px] font-medium text-muted-foreground">{hero.eyebrow}</p>
// <p className="mt-3.5 max-w-[70ch] text-base leading-[1.55] text-fg-secondary">
//   {renderLead(hero.lead, hero.facts)}
// </p>
// <p className="mt-2 text-xs text-muted-foreground">
//   {hero.factsSources.map((source, i) => (
//     <Fragment key={source.url}>
//       {i > 0 && "; "}
//       {source.label}:{" "}
//       <a href={source.url} target="_blank" rel="noreferrer" title={source.title}
//          className="underline underline-offset-2 transition-colors hover:text-foreground">
//         {source.publisher}, {source.year}
//       </a>
//     </Fragment>
//   ))}
// </p>
//
// const meta = hero.meta.filter((row) => row.value)
// {meta.length > 0 && (
//   <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-5 gap-y-1.5 pb-1 text-[13px] leading-normal">
//     {meta.map((row) => (
//       <Fragment key={row.label}>
//         <dt className="text-muted-foreground">{row.label}</dt>
//         <dd className="font-medium">
//           {row.to ? (
//             <Link to={row.to} className="text-link transition-colors hover:text-link-hover">{row.value}</Link>
//           ) : (
//             row.value
//           )}
//         </dd>
//       </Fragment>
//     ))}
//   </dl>
// )}
