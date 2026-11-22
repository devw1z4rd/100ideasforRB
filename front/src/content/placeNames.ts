import { isBelarusian } from "@/lib/locale"

type NamedDistrict = { name: string; name_be?: string }

export function districtName(district: NamedDistrict): string {
  return (isBelarusian && district.name_be?.trim()) || district.name
}

export function districtLabel(name: string): string {
  if (!name || name.startsWith("г.") || name === "Гомель") return name
  return isBelarusian ? `${name} раён` : `${name} район`
}

// Display names for the air points. Keep the source names for shared URLs and record lookups.
const townNames: ReadonlyMap<string, string> = new Map([
  ["Брагин", "Брагін"],
  ["Буда-Кошелёво", "Буда-Кашалёва"],
  ["Ветка", "Ветка"],
  ["Добруш", "Добруш"],
  ["Ельск", "Ельск"],
  ["Житковичи", "Жыткавічы"],
  ["Жлобин", "Жлобін"],
  ["Калинковичи", "Калінкавічы"],
  ["Корма", "Карма"],
  ["Лельчицы", "Лельчыцы"],
  ["Лоев", "Лоеў"],
  ["Мозырь", "Мазыр"],
  ["Наровля", "Нароўля"],
  ["Октябрьский", "Акцябрскі"],
  ["Петриков", "Петрыкаў"],
  ["Речица", "Рэчыца"],
  ["Рогачёв", "Рагачоў"],
  ["Светлогорск", "Светлагорск"],
  ["Хойники", "Хойнікі"],
  ["Чечерск", "Чачэрск"],
])

export function townName(name: string): string {
  return (isBelarusian && townNames.get(name)) || name
}
