import { Plus, X } from "lucide-react"
import { useInView } from "motion/react"
import { useMemo, useRef } from "react"
import { useSearchParams } from "react-router"
import { FormSection, NumberField, Segmented, SelectField } from "@/components/calculator/fields"
import { ResultPanel } from "@/components/calculator/ResultPanel"
import { Container } from "@/components/layout/Container"
import {
  calculator as text,
  destinations,
  dietOptions,
  factors,
  fuelLabels,
  minskAirport,
} from "@/content/calculator"
import { footprint, greatCircleKm, suggestions, type Fuel } from "@/lib/carbon"
import { CUSTOM, initialState, readState, toInputs, writeState, type FormState } from "@/lib/calculatorParams"
import { formatNumber } from "@/lib/format"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"

// Расстояния от Минска считаются один раз
const kmTo = new Map(destinations.map((d) => [d.id, Math.round(greatCircleKm(minskAirport, d))]))
const fuelOptions = (Object.keys(fuelLabels) as Fuel[]).map((key) => ({ key, label: fuelLabels[key] }))

/** «Калькулятор углеродного следа» (§4 S7): всё считается в браузере, состояние — в адресе страницы. */
export function CalculatorPage() {
  useDocumentTitle(text.title)
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => readState(params), [params])
  const set = (patch: Partial<FormState>) =>
    setParams(writeState({ ...state, ...patch }), { replace: true, preventScrollReset: true })

  const inputs = useMemo(() => toInputs(state, (id) => kmTo.get(id) ?? 0), [state])
  const result = useMemo(() => footprint(inputs, factors), [inputs])
  const tips = useMemo(() => suggestions(inputs, factors), [inputs])
  const f = text.fields
  const formRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const resultVisible = useInView(resultRef, { margin: "0px 0px -30% 0px" })
  // Полоса с итогом — пока заполняется форма и сам результат ещё не на экране
  const formVisible = useInView(formRef, { margin: "0px 0px -40% 0px" }) && !resultVisible

  const setFlight = (index: number, patch: Partial<FormState["flights"][number]>) =>
    set({ flights: state.flights.map((fl, i) => (i === index ? { ...fl, ...patch } : fl)) })

  return (
    <Container className="py-16 md:py-24">
      <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>
      <p className="mt-4 max-w-[70ch] text-base leading-[1.55] text-fg-secondary">{text.lead}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <div ref={formRef} className="space-y-8">
          <FormSection title={text.sections.food.title}>
            <Segmented
              label={text.sections.food.title}
              value={state.diet}
              options={dietOptions}
              onChange={(diet) => set({ diet })}
              className="sm:grid-cols-2 xl:grid-cols-3"
            />
          </FormSection>

          <FormSection title={text.sections.home.title} hint={text.sections.home.hint}>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={f.people.label}
                value={state.people}
                placeholder="1"
                onChange={(people) => set({ people })}
              />
              <NumberField
                label={f.electricity.label}
                unit={f.electricity.unit}
                value={state.electricity}
                onChange={(electricity) => set({ electricity })}
              />
              <NumberField
                label={f.gas.label}
                hint={f.gas.hint}
                unit={f.gas.unit}
                value={state.gas}
                onChange={(gas) => set({ gas })}
              />
              <NumberField
                label={f.heat.label}
                hint={f.heat.hint}
                unit={f.heat.unit}
                value={state.heat}
                onChange={(heat) => set({ heat })}
              />
            </div>
          </FormSection>

          <FormSection title={text.sections.transport.title}>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={f.carKm.label}
                unit={f.carKm.unit}
                value={state.carKm}
                onChange={(carKm) => set({ carKm })}
              />
              <NumberField
                label={f.carConsumption.label}
                unit={f.carConsumption.unit}
                placeholder={f.carConsumption.placeholder}
                value={state.carConsumption}
                onChange={(carConsumption) => set({ carConsumption })}
              />
              <div>
                <p className="text-[13px] font-medium">{f.fuel.label}</p>
                <Segmented
                  label={f.fuel.label}
                  value={state.fuel}
                  options={fuelOptions}
                  onChange={(fuel) => set({ fuel })}
                  className="mt-1.5 grid-cols-3"
                />
              </div>
              <NumberField
                label={f.carPassengers.label}
                unit={f.carPassengers.unit}
                value={state.carPassengers}
                onChange={(carPassengers) => set({ carPassengers })}
              />
              {inputs.carKm > 0 && inputs.carConsumption === 0 && (
                <p className="text-[13px] text-destructive sm:col-span-2">{text.needConsumption}</p>
              )}
              <NumberField
                label={f.busKm.label}
                unit={f.busKm.unit}
                value={state.busKm}
                onChange={(busKm) => set({ busKm })}
              />
              <NumberField
                label={f.railKm.label}
                unit={f.railKm.unit}
                value={state.railKm}
                onChange={(railKm) => set({ railKm })}
              />
            </div>
          </FormSection>

          <FormSection title={text.sections.flights.title} hint={text.sections.flights.hint}>
            <ul className="space-y-3">
              {state.flights.map((fl, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      label={f.destination.label}
                      value={fl.dest}
                      onChange={(dest) => setFlight(i, { dest })}
                      className={fl.dest === CUSTOM ? "" : "sm:col-span-2"}
                    >
                      {destinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label} — {formatNumber(kmTo.get(d.id)!)} км
                        </option>
                      ))}
                      <option value={CUSTOM}>{f.customKm}</option>
                    </SelectField>
                    {fl.dest === CUSTOM && (
                      <NumberField
                        label={f.customKmUnit}
                        unit="км"
                        value={fl.km}
                        onChange={(km) => setFlight(i, { km })}
                      />
                    )}
                  </div>
                  <NumberField
                    label={f.trips.label}
                    value={fl.trips}
                    placeholder="1"
                    onChange={(trips) => setFlight(i, { trips })}
                  />
                  <button
                    type="button"
                    aria-label={f.removeFlight}
                    onClick={() => set({ flights: state.flights.filter((_, j) => j !== i) })}
                    className="grid size-10 cursor-pointer place-items-center rounded-md border border-input text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => set({ flights: [...state.flights, { dest: "IST", km: "", trips: "1" }] })}
              className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-[14px] font-medium transition-colors hover:bg-muted"
            >
              <Plus className="size-4" />
              {f.addFlight}
            </button>
          </FormSection>
        </div>

        <div ref={resultRef} className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <ResultPanel
            result={result}
            suggestions={tips}
            onReset={() => setParams(writeState(initialState), { replace: true, preventScrollReset: true })}
          />
        </div>
      </div>

      <section className="mt-12 border-t border-border pt-6 lg:max-w-[calc(100%-400px-4rem)]">
        <h2 className="font-heading text-xl font-semibold tracking-[-0.02em]">{text.methodTitle}</h2>
        <ul className="mt-3 max-w-[75ch] list-disc space-y-1.5 pl-5 text-[14px] text-fg-secondary">
          {text.method.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="mt-4 max-w-[75ch] text-xs leading-[1.5] text-muted-foreground">{text.note}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          {text.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && " · "}
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                title={s.title}
                className="underline underline-offset-2 transition-colors hover:text-foreground"
              >
                {s.publisher}, {s.year}
              </a>
            </span>
          ))}
        </p>
      </section>

      {/* Телефон: итог виден, пока заполняется форма; результат целиком — ниже формы */}
      <div
        aria-hidden={!formVisible}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm transition-transform lg:hidden",
          formVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {formatNumber(result.total / 1000, 1)}
          </span>
          <span className="text-[13px] text-muted-foreground">{text.result.unit}</span>
        </p>
        <a href="#calc-result" tabIndex={formVisible ? 0 : -1} className="text-[13px] font-medium text-link">
          {text.result.details} ↓
        </a>
      </div>
    </Container>
  )
}
