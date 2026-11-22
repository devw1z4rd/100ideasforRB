import { t } from "@/lib/locale"
/**
 * US AQI breakpoints per US EPA "Technical Assistance Document for the Reporting of Daily Air Quality — the
 * AQI" (EPA-403/B-26-003, May 2026). Open-Meteo's us_aqi uses the same scale.
 */
export type AqiLevel = "good" | "moderate" | "usg" | "unhealthy" | "very-unhealthy" | "hazardous"

export type AqiCategory = {
  level: AqiLevel
  label: string
  min: number
  max: number
  color: `var(--aqi-${AqiLevel})`
}

export const AQI_SCALE: readonly AqiCategory[] = [
  { level: "good", label: t("хороший", "добры"), min: 0, max: 50, color: "var(--aqi-good)" },
  { level: "moderate", label: t("умеренный", "умераны"), min: 51, max: 100, color: "var(--aqi-moderate)" },
  {
    level: "usg",
    label: t("вреден для чувствительных групп", "шкодны для адчувальных груп"),
    min: 101,
    max: 150,
    color: "var(--aqi-usg)",
  },
  { level: "unhealthy", label: t("вредный", "шкодны"), min: 151, max: 200, color: "var(--aqi-unhealthy)" },
  {
    level: "very-unhealthy",
    label: t("очень вредный", "вельмі шкодны"),
    min: 201,
    max: 300,
    color: "var(--aqi-very-unhealthy)",
  },
  {
    level: "hazardous",
    label: t("опасный", "небяспечны"),
    min: 301,
    max: Number.POSITIVE_INFINITY,
    color: "var(--aqi-hazardous)",
  },
]

export function aqiCategory(value: number | null | undefined): AqiCategory | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null
  const aqi = Math.round(value)
  return AQI_SCALE.find((category) => aqi <= category.max) ?? AQI_SCALE[AQI_SCALE.length - 1]
}
