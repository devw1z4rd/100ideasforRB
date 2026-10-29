/**
 * Шкала US AQI — US EPA, «Technical Assistance Document for the Reporting of Daily Air Quality — the AQI» (2024).
 * Open-Meteo отдаёт us_aqi по этой же шкале (CLAUDE.md §9). Цвета — токены --aqi-* в tokens.css.
 */
export type AqiLevel = "good" | "moderate" | "usg" | "unhealthy" | "very-unhealthy" | "hazardous"

export type AqiCategory = {
  level: AqiLevel
  /** Подпись в интерфейсе */
  label: string
  /** Границы категории включительно, целые значения индекса */
  min: number
  max: number
  /** CSS-переменная цвета */
  color: `var(--aqi-${AqiLevel})`
}

export const AQI_SCALE: readonly AqiCategory[] = [
  { level: "good", label: "хороший", min: 0, max: 50, color: "var(--aqi-good)" },
  { level: "moderate", label: "умеренный", min: 51, max: 100, color: "var(--aqi-moderate)" },
  { level: "usg", label: "вреден для чувствительных групп", min: 101, max: 150, color: "var(--aqi-usg)" },
  { level: "unhealthy", label: "вредный", min: 151, max: 200, color: "var(--aqi-unhealthy)" },
  { level: "very-unhealthy", label: "очень вредный", min: 201, max: 300, color: "var(--aqi-very-unhealthy)" },
  { level: "hazardous", label: "опасный", min: 301, max: 500, color: "var(--aqi-hazardous)" },
]

/**
 * Категория для значения индекса. Дробные значения (средние за период) округляются до целого, как в шкале EPA;
 * всё выше 500 — «опасный». null — для отсутствующего или некорректного значения.
 */
export function aqiCategory(value: number | null | undefined): AqiCategory | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null
  const aqi = Math.round(value)
  return AQI_SCALE.find((category) => aqi <= category.max) ?? AQI_SCALE[AQI_SCALE.length - 1]
}
