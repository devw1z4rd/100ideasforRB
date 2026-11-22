from datetime import UTC, datetime, timedelta, timezone
from html import escape
from urllib.parse import urlencode, urlsplit

from aiogram.filters.callback_data import CallbackData
from aiogram.types import CopyTextButton, InlineKeyboardButton, InlineKeyboardMarkup, LinkPreviewOptions

STATUS_LABELS = {
    "new": "Новое",
    "accepted": "Принято",
    "forwarded": "Передано",
    "resolved": "Устранено",
    "rejected": "Отклонено",
}
CATEGORY_LABELS = {
    "dump": "Свалка",
    "discharge": "Сброс в воду",
    "smoke": "Дым, выбросы",
    "felling": "Вырубка",
    "burning": "Пал, горение",
    "other": "Другое",
}
TRANSITIONS = {
    "new": ("accepted", "rejected"),
    "accepted": ("forwarded", "resolved", "rejected"),
    "forwarded": ("resolved", "rejected"),
}
ACTION_LABELS = {
    "accepted": "Принять",
    "forwarded": "Передать",
    "resolved": "Отметить устранённым",
    "rejected": "Отклонить",
}
MINSK_TIME = timezone(timedelta(hours=3))
LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}


class ModerationAction(CallbackData, prefix="r", sep="|"):
    report_id: str
    current: str
    target: str


def report_date(created: str) -> str:
    try:
        timestamp = datetime.fromisoformat(created)
    except ValueError:
        return "дата не указана"
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=UTC)
    return timestamp.astimezone(MINSK_TIME).strftime("%d-%m-%Y в %H:%M (Минск)")


def report_card(report, site_url):
    report_id = report["id"]
    status = report["status"]
    duplicate_of = report.get("duplicate_of")
    category = CATEGORY_LABELS.get(report["category"], report["category"])
    district = report.get("expand", {}).get("district", {}).get("name") or "Не определён"
    description = (report.get("description") or "Без описания")[:1000]
    lines = [
        f"📩 <b>Получено обращение #{escape(report_id)}</b>",
        f"Статус: {escape(STATUS_LABELS.get(status, status))}",
        f"Категория: {escape(category)}",
        f"Район: {escape(district)}",
        f"Описание: {escape(description)}",
    ]
    location = report.get("location") or {}
    if duplicate_of:
        lines.append(f"Повторное обращение. Основное: #{escape(duplicate_of)}")
    if isinstance(location.get("lat"), (int, float)) and isinstance(location.get("lon"), (int, float)):
        lat, lon = location["lat"], location["lon"]
        point = f"{lon},{lat}"
        query = urlencode({"ll": point, "z": 16, "mode": "whatshere", "whatshere[point]": point, "whatshere[zoom]": 16})
        maps_url = f"https://yandex.ru/maps/?{query}"
        lines.append(f'<a href="{escape(maps_url)}">Открыть в Яндекс Картах</a>')

    photo_count = len(report.get("photos") or [])
    lines.append(f"Фото: {photo_count}" if photo_count else "Фото: нет")
    lines.append(f"Создано: {report_date(report.get('created') or '')}")
    site_link = f"{site_url}/login?{urlencode({'next': f'/reports/{report_id}'})}"
    site_origin = urlsplit(site_url)
    site_buttons = []
    if site_origin.hostname not in LOOPBACK_HOSTS:
        site_buttons.append(InlineKeyboardButton(text="Открыть на сайте", url=site_link))
    if site_origin.scheme == "http" or site_origin.hostname in LOOPBACK_HOSTS:
        site_buttons.append(InlineKeyboardButton(text="Скопировать ссылку", copy_text=CopyTextButton(text=site_link)))

    buttons = [
        InlineKeyboardButton(
            text=ACTION_LABELS[target],
            callback_data=ModerationAction(report_id=report_id, current=status, target=target).pack(),
        )
        for target in (() if duplicate_of else TRANSITIONS.get(status, ()))
    ]
    return {
        "text": "\n".join(lines),
        "parse_mode": "HTML",
        "link_preview_options": LinkPreviewOptions(is_disabled=True),
        "reply_markup": InlineKeyboardMarkup(inline_keyboard=[site_buttons, *[[button] for button in buttons]]),
    }
