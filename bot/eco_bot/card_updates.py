import asyncio
import logging

from aiohttp import ClientError
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramRetryAfter

from .delivery_state import ReportCard
from .pocketbase import PocketBaseError
from .report_cards import report_card

log = logging.getLogger(__name__)
POLL_INTERVAL = 2.5


class CardUpdates:
    def __init__(self, bot, pocketbase, site_url, moderation_chat, state):
        self.bot = bot
        self.pocketbase = pocketbase
        self.site_url = site_url
        self.moderation_chat = moderation_chat
        self.state = state

    async def remember(self, report_id, message, *, replace=False):
        async with self.state.card_lock:
            card = self.state.cards.get(report_id)
            if replace or card is None or card.chat_id != self.moderation_chat.id:
                self.state.cards[report_id] = ReportCard(message.chat.id, message.message_id)
                self.state.save()

    async def refresh(self, report_id):
        async with self.state.card_lock:
            card = self.state.cards.get(report_id)
            if card is None or card.chat_id != self.moderation_chat.id:
                return False

            try:
                report = await self.pocketbase.report(report_id)
            except PocketBaseError as error:
                if error.status != 404:
                    raise
                self.state.cards.pop(report_id, None)
                self.state.save()
                return False
            duplicate_of = report.get("duplicate_of") or ""
            if card.status == report["status"] and card.duplicate_of == duplicate_of:
                return True

            try:
                await self.bot.edit_message_text(
                    chat_id=card.chat_id, message_id=card.message_id, **report_card(report, self.site_url)
                )
            except TelegramBadRequest as error:
                reason = error.message.lower()
                if "message to edit not found" in reason or "message can't be edited" in reason:
                    self.state.cards.pop(report_id, None)
                    self.state.save()
                    return False
                if "message is not modified" not in reason:
                    raise

            card.status = report["status"]
            card.duplicate_of = duplicate_of
            self.state.save()
            return True

    async def poll(self):
        while True:
            delay = POLL_INTERVAL
            try:
                if self.state.cards:
                    changes = await self.pocketbase.report_status_changes(self.state.status_cursor)
                    for event in changes:
                        await self.refresh(event["report"])
                        self.state.status_cursor = (event["created"], event["id"])
                    if changes:
                        self.state.save()
            except TelegramRetryAfter as error:
                delay = max(delay, error.retry_after)
            except (PocketBaseError, ClientError, TimeoutError, TelegramAPIError) as error:
                log.warning("Telegram card sync failed (%s). Retrying.", type(error).__name__)
                delay = 5
            await asyncio.sleep(delay)
