import DOMPurify from "dompurify"

// Текст новостей и статей — HTML из редактора админки (CLAUDE.md §13: пользовательский текст не рендерится как HTML,
// rich text — только через DOMPurify). Инлайновые стили убираем: текст выглядит как остальной сайт.

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Внешние ссылки — в новой вкладке и без доступа к window.opener
  if (node.tagName === "A" && /^https?:\/\//i.test(node.getAttribute("href") ?? "")) {
    node.setAttribute("target", "_blank")
    node.setAttribute("rel", "noopener noreferrer")
  }
})

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
    FORBID_ATTR: ["style", "class", "id"],
  })
}
