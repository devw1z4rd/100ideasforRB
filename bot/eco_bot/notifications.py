import asyncio
import logging

from aiohttp import ClientError
from aiogram.exceptions import TelegramAPIError, TelegramMigrateToChat, TelegramRetryAfter

from .delivery_state import PendingPhotos, ReportCard
from .photos import send_report_photos
from .pocketbase import PocketBaseError
from .report_cards import report_card

log = logging.getLogger(__name__)
POLL_INTERVAL = 2.5


async def forward_report(bot, pocketbase, site_url, chat_id, state, event_id, report):
    report_id = report["id"]
    photos = report.get("photos") or []
    pending = state.pending_photos
    if pending is None or pending.event_id != event_id or pending.chat_id != chat_id:
        async with state.card_lock:
            existing = state.cards.get(report_id)
            if not photos and existing and existing.chat_id == chat_id:
                return
            try:
                report = await pocketbase.report(report_id)
            except PocketBaseError as error:
                if error.status == 404:
                    return
                raise
            message = await bot.send_message(chat_id, protect_content=True, **report_card(report, site_url))
            state.cards[report_id] = ReportCard(chat_id, message.message_id, report["status"], report.get("duplicate_of") or "")
            pending = PendingPhotos(event_id, chat_id, message.message_id) if photos else None
            state.pending_photos = pending
            state.save()
    elif report_id not in state.cards:
        state.cards[report_id] = ReportCard(chat_id, pending.message_id)
        state.save()

    if pending and pending.next_photo < len(photos):
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
