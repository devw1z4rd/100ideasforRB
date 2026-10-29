import type { ReactNode } from "react"
import { Container } from "@/components/layout/Container"
import { air } from "@/content/air"
import { dataPage } from "@/content/data"
import { enterprises } from "@/content/enterprises"
import { water } from "@/content/water"
import { hero } from "@/content/hero"
import { AQI_SCALE, type AqiCategory } from "@/lib/aqi"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

const h2 = "font-heading text-[clamp(24px,2.6vw,32px)] leading-[1.15] font-semibold tracking-[-0.02em]"
const sourceLink = "font-medium text-link transition-colors hover:text-link-hover"

const aqiRange = ({ min, max }: AqiCategory) => (Number.isFinite(max) ? `${min}–${max}` : `${min} и выше`)

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-14">
      <h2 id={id} className={h2}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** «Данные и методика» (M7): источники чисел на сайте, шкала AQI, принципы работы с данными. */
export function DataPage() {
  useDocumentTitle(dataPage.title)
  const { aqi } = dataPage

  return (
    <Container className="py-16 md:py-24">
      <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {dataPage.title}
      </h1>
      <p className="mt-4 max-w-[70ch] text-base leading-[1.55] text-fg-secondary">{dataPage.lead}</p>

      <Section id="data-sources" title={dataPage.sources.title}>
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {[
            ...hero.factsSources.map((source) => ({ source, usedOn: dataPage.sources.usedOn })),
            ...air.sources.map((source) => ({ source, usedOn: dataPage.sources.airUsedOn })),
            ...enterprises.sourcesList.map((source) => ({
              source,
              usedOn: dataPage.sources.enterprisesUsedOn,
            })),
            ...water.sources.map((source) => ({ source, usedOn: dataPage.sources.waterUsedOn })),
          ].map(({ source, usedOn }) => (
            <li
              key={`${source.label}-${source.url}`}
              className="grid gap-1 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-8"
            >
              <div>
                <a href={source.url} target="_blank" rel="noreferrer" className={sourceLink}>
                  {source.title}
                </a>
                <p className="text-[13px] text-muted-foreground">
                  {source.publisher}, {source.year}
                </p>
              </div>
              <p className="text-[13px] text-muted-foreground md:text-right">
                <span className="block first-letter:uppercase">{source.label}</span>
                {usedOn}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="data-aqi" title={aqi.title}>
        <p className="mt-3 max-w-[70ch] text-fg-secondary">{aqi.lead}</p>
        <table className="mt-6 w-full max-w-xl text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-6 font-medium">
                Индекс
              </th>
              <th scope="col" className="py-2 font-medium">
                Категория
              </th>
            </tr>
          </thead>
          <tbody>
            {AQI_SCALE.map((category) => (
              <tr key={category.level} className="border-t border-border">
                <td className="py-2.5 pr-6 whitespace-nowrap tabular-nums">{aqiRange(category)}</td>
                <td className="py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: category.color }}
                    />
                    <span className="inline-block first-letter:uppercase">{category.label}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          {aqi.source.label}:{" "}
          <a
            href={aqi.source.url}
            target="_blank"
            rel="noreferrer"
            title={aqi.source.title}
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {aqi.source.publisher}, {aqi.source.year}
          </a>
        </p>
      </Section>

      <Section id="data-air" title={air.methodology.title}>
        <ul className="mt-4 max-w-[70ch] list-disc space-y-2 pl-5 text-fg-secondary">
          {air.methodology.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section id="data-principles" title={dataPage.principles.title}>
        <ul className="mt-4 max-w-[70ch] list-disc space-y-2 pl-5 text-fg-secondary">
          {dataPage.principles.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </Container>
  )
}
