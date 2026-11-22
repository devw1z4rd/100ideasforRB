import asyncio
import json
import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime

from aiohttp import ClientError
from aiogram.exceptions import TelegramAPIError, TelegramMigrateToChat, TelegramRetryAfter

from .config import BOT_DIR
from .photos import send_report_photos
from .pocketbase import PocketBaseError
from .report_cards import report_card

log = logging.getLogger(__name__)
POLL_INTERVAL = 2.5
STATE_PATH = BOT_DIR / ".state.json"


@dataclass
class PendingPhotos:
    event_id: str
    chat_id: int
    message_id: int
    next_photo: int = 0


@dataclass
class DeliveryState:
    started_at: str
    cursor: tuple[str, str] | None
    legacy_ids: set[str]
    pending_photos: PendingPhotos | None = None

    @classmethod
    def load(cls):
        try:
            data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except FileNotFoundError:
            data = {}
        now = datetime.now(UTC).isoformat(sep=" ", timespec="milliseconds").replace("+00:00", "Z")
        cursor = tuple(data["cursor"]) if data.get("cursor") else None
        pending = data.get("pending_photos")
        return cls(
            data.get("started_at", now), cursor, set(data.get("notifiedReports", [])),
            PendingPhotos(**pending) if pending else None,
        )

    def save(self):
        data = {
            "started_at": self.started_at,
            "cursor": self.cursor,
            "notifiedReports": sorted(self.legacy_ids),
            "pending_photos": asdict(self.pending_photos) if self.pending_photos else None,
        }
        temporary = STATE_PATH.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(data), encoding="utf-8")
        temporary.replace(STATE_PATH)


async def forward_report(bot, pocketbase, site_url, chat_id, state, event_id, report):
    photos = report.get("photos") or []
    pending = state.pending_photos
    if pending is None or pending.event_id != event_id or pending.chat_id != chat_id:
        message = await bot.send_message(
            chat_id, protect_content=True, **report_card(report, site_url)
        )
        if not photos:
            return
        pending = PendingPhotos(event_id, chat_id, message.message_id)
        state.pending_photos = pending
        state.save()

    if pending.next_photo < len(photos):
        await send_report_photos(
            bot, pocketbase, pending.chat_id, pending.message_id, report, photos[pending.next_photo:]
        )


async def forward_reports(bot, pocketbase, settings, moderation_chat, state):
    state.save()
    while True:
        delay = POLL_INTERVAL
        try:
            events = await pocketbase.report_creations(state.started_at, state.cursor)
            for event in events:
                report = event.get("expand", {}).get("report")
                if report is None:
                    raise ValueError("PocketBase did not expand the report in its creation event")
                if report["id"] not in state.legacy_ids:
                    await forward_report(bot, pocketbase, settings.site_url, moderation_chat.id, state, event["id"], report)
                    log.info("Forwarded report %s", report["id"])
                state.cursor = (event["created"], event["id"])
                state.pending_photos = None
                state.save()
        except TelegramMigrateToChat as error:
            try:
                await moderation_chat.migrate(bot, error.migrate_to_chat_id)
            except (TelegramAPIError, ValueError) as check_error:
                log.warning("Could not confirm Telegram migration to %s (%s). Delivery is paused pending verification.",
                            error.migrate_to_chat_id, type(check_error).__name__)
                delay = 5
            else:
                delay = 0
        except TelegramRetryAfter as error:
            delay = max(delay, error.retry_after)
        except (PocketBaseError, ClientError, TimeoutError, TelegramAPIError) as error:
            log.warning("Report delivery failed (%s). Retrying.", type(error).__name__)
            delay = 5
        await asyncio.sleep(delay)
