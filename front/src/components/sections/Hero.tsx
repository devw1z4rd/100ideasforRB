import { Fragment } from "react"
import { Link } from "react-router"
import { Container } from "@/components/layout/Container"
import { hero, type HeroFact } from "@/content/hero"

/** Делит lead по плейсхолдерам {key} и подставляет выделенные факты. */
function renderLead(lead: string, facts: Record<string, HeroFact>) {
  return lead.split(/(\{\w+\})/).map((part, i) => {
    const fact = part.startsWith("{") ? facts[part.slice(1, -1)] : undefined
    if (!fact) return <Fragment key={i}>{part}</Fragment>
    return (
      <span key={i} className="font-medium text-foreground tabular-nums">
        {fact.format}
      </span>
    )
  })
}

export function Hero() {
  const meta = hero.meta.filter((row) => row.value)

  return (
    <section id="top" aria-labelledby="hero-title" className="scroll-mt-(--header-h)">
      <Container className="flex flex-col gap-8 pt-9 pb-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">{hero.eyebrow}</p>
          {/* line-height 1.05 вместо 1 из макета — иначе двухстрочный H1 наезжает на lead (§10.3) */}
          <h1
            id="hero-title"
            className="mt-2 font-heading text-[clamp(40px,5vw,68px)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance"
          >
            {hero.title}
          </h1>
          <p className="mt-3.5 max-w-[70ch] text-base leading-[1.55] text-fg-secondary">
            {renderLead(hero.lead, hero.facts)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {hero.factsSources.map((source, i) => (
              <Fragment key={source.url}>
                {i > 0 && "; "}
                {source.label}:{" "}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  title={source.title}
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  {source.publisher}, {source.year}
                </a>
              </Fragment>
            ))}
          </p>
        </div>

        {meta.length > 0 && (
          <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-5 gap-y-1.5 pb-1 text-[13px] leading-normal">
            {meta.map((row) => (
              <Fragment key={row.label}>
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium">
                  {row.to ? (
                    <Link to={row.to} className="text-link transition-colors hover:text-link-hover">
                      {row.value}
                    </Link>
                  ) : (
                    row.value
                  )}
                </dd>
              </Fragment>
            ))}
          </dl>
        )}
      </Container>
    </section>
  )
}
