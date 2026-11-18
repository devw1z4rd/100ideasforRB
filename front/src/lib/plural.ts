const rules = new Intl.PluralRules("ru-RU")

/** Русское склонение по числу: plural(1, "участок", "участка", "участков") → «участок» */
export function plural(n: number, one: string, few: string, many: string): string {
  const form = rules.select(n)
  return form === "one" ? one : form === "few" ? few : many
}
