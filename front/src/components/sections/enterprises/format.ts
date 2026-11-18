import { formatNumber } from "@/lib/format"

// Форматирование чисел секции «Предприятия»

export const pct = (v: number, digits = 0) => `${formatNumber(v, digits)}%`

/** Тысячи тонн целым числом: «80», «1 784» */
export const kt = (v: number) => formatNumber(Math.round(v))
