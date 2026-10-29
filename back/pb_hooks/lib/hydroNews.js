// Обзоры гидрологической обстановки Белгидромета → news (CLAUDE.md §8, §9): официальный текст как есть,
// карта уровенного режима — обложкой, ссылка на обзор — source_url. Белгидромет публикует обзор 1–2 раза в неделю.
// Подключать внутри обработчика: require(`${__hooks}/lib/hydroNews.js`).

// BELGIDROMET_URL — подмена адреса для тестов и локального прокси; в source_url всегда настоящий адрес
const BASE = $os.getenv("BELGIDROMET_URL") || "https://belgidromet.by"
const PUBLIC = "https://belgidromet.by"
const LIST = "/ru/gidrolog-ru/"
const TAG = "Реки"
// belgidromet.by иногда рвёт соединение — повторяем с паузой
const ATTEMPTS = 4

const ENTITIES = {
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  quot: '"',
  amp: "&",
  lt: "<",
  gt: ">",
  ndash: "–",
  mdash: "—",
  deg: "°",
  hellip: "…",
}
const decode = (s) =>
  s.replace(/&(#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  )
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const stripTags = (s) =>
  decode(s.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()

function get(path) {
  let error
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = $http.send({ url: BASE + path, method: "GET", timeout: 30 })
      if (res.statusCode === 200) return toString(res.body)
      error = new Error(`belgidromet.by ${path}: ${res.statusCode}`)
      if (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429) break
    } catch (e) {
      error = e
    }
    sleep(2000 * 2 ** i)
  }
  throw error
}

// Пути обзоров со страницы «Информация гидролога» — на ней последние три
function listReviews() {
  const html = get(LIST)
  const paths = []
  for (const m of html.matchAll(/href="(?:https:\/\/belgidromet\.by)?(\/ru\/gidrolog-ru\/view\/[^"#?]+)"/g)) {
    if (!paths.includes(m[1])) paths.push(m[1])
  }
  return paths
}

// Страница обзора: дата (inner-date), заголовок (h2), текст до «При использовании информации…», карта из /uploads/
function parseReview(html) {
  const date = html.match(/class="inner-date">\s*(\d{2})\.(\d{2})\.(\d{4})/)
  const title = html.match(/<h2>([\s\S]*?)<\/h2>/)
  const container = html.indexOf("news-container")
  const start = html.indexOf(">", container) + 1
  const end = html.indexOf("При использовании информации", start)
  if (!date || !title || container < 0 || end < 0) throw new Error("обзор: не найдены дата, заголовок или текст")

  const content = html.slice(start, end)
  const map = content.match(/<img[^>]+src="(\/uploads\/[^"]+)"/)
  const paragraphs = content
    .replace(/<img[^>]*>/gi, "")
    .split(/<br\s*\/?>|<\/p>/i)
    .map(stripTags)
    .filter((p) => p.length > 0)
  if (!paragraphs.length) throw new Error("обзор: пустой текст")
  return {
    day: `${date[3]}-${date[2]}-${date[1]}`,
    title: stripTags(title[1]),
    paragraphs,
    map: map ? map[1] : "",
  }
}

// Импорт обзоров по путям (по умолчанию — с главной страницы раздела). Уже загруженные (по source_url) пропускаются,
// поэтому правки в админке не затираются. Возвращает число новых и упавших.
function importReviews(app, paths) {
  const list = paths && paths.length ? paths : listReviews()
  const collection = app.findCollectionByNameOrId("news")
  let added = 0
  let failed = 0
  for (const path of list) {
    const sourceUrl = PUBLIC + path
    try {
      app.findFirstRecordByData("news", "source_url", sourceUrl)
      continue
    } catch {
      // ещё не загружен
    }
    try {
      const r = parseReview(get(path))
      const record = new Record(collection)
      record.load({
        title: r.title,
        slug: `hydro-${r.day}`,
        body: r.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
        tag: TAG,
        // Время публикации в обзоре не указано — только день
        published_at: `${r.day} 00:00:00.000Z`,
        source_url: sourceUrl,
        is_published: true,
      })
      if (r.map) {
        try {
          record.set("cover", $filesystem.fileFromURL(BASE + encodeURI(r.map), 60))
        } catch (e) {
          app.logger().warn("hydro_news: карта", "path", r.map, "error", String(e))
        }
      }
      app.save(record)
      added++
    } catch (e) {
      failed++
      app.logger().warn("hydro_news", "path", path, "error", String(e))
    }
  }
  return { found: list.length, added, failed }
}

// "https://belgidromet.by/ru/gidrolog-ru/view/…/" → "/ru/gidrolog-ru/view/…/"
const toPath = (url) => url.replace(/^https?:\/\/[^/]+/, "")

module.exports = { importReviews, parseReview, toPath }
