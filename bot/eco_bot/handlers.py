import logging
import re

from aiohttp import ClientError
from aiogram import Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, CommandObject
from aiogram.types import CallbackQuery, Message

from .config import Settings
from .moderation_chat import ModerationChat
from .pocketbase import PocketBase, PocketBaseError
from .report_cards import ModerationAction, STATUS_LABELS, TRANSITIONS, report_card

log = logging.getLogger(__name__)
router = Router()


@router.message(Command("id", "chatid"))
async def show_ids(message: Message, command: CommandObject):
    if message.from_user and not message.sender_chat:
        await message.reply(f"Ваш Telegram ID: {message.from_user.id}\nID чата: {message.chat.id}")
    elif command.command == "chatid":
        await message.reply(f"ID чата: {message.chat.id}")


@router.message(Command("start", "help"))
async def show_help(message: Message, settings: Settings, moderation_chat: ModerationChat):
    if message.chat.id == moderation_chat.id and message.from_user and message.from_user.id in settings.moderator_ids:
        await message.answer("Здесь появляются новые обращения. Кнопки под сообщением меняют статус на сайте.")


@router.callback_query(ModerationAction.filter())
async def moderate(
    callback: CallbackQuery,
    callback_data: ModerationAction,
    settings: Settings,
    moderation_chat: ModerationChat,
    pocketbase: PocketBase,
):
    message = callback.message
    if (
        not isinstance(message, Message)
        or message.chat.id != moderation_chat.id
        or callback.from_user.id not in settings.moderator_ids
    ):
        await callback.answer("Нет доступа к модерации.", show_alert=True)
        return

    action = callback_data
    if not re.fullmatch(r"[a-z0-9]{15}", action.report_id) or action.target not in TRANSITIONS.get(action.current, ()):
        await callback.answer("Некорректная команда.", show_alert=True)
        return

    try:
        report = await pocketbase.report(action.report_id)
        if report["status"] == action.current:
            changed = await pocketbase.change_status(action.report_id, action.target)
            report["status"] = changed["status"]
            log.info("Telegram moderator %s changed report %s to %s", callback.from_user.id, action.report_id, report["status"])
            response = "Статус изменён"
        else:
            response = "Статус уже изменился"
    except (ClientError, PocketBaseError, TimeoutError) as error:
        log.warning("Could not update report %s (%s)", action.report_id, type(error).__name__)
        await callback.answer("Не удалось обновить обращение. Попробуйте ещё раз.", show_alert=True)
        return

    try:
        await callback.answer(f"{response}: {STATUS_LABELS[report['status']]}.")
    finally:
        try:
            await message.edit_text(**report_card(report, settings.site_url))
        except TelegramAPIError as error:
            log.warning("Could not refresh Telegram card for %s (%s)", action.report_id, type(error).__name__)


@router.callback_query(lambda callback: (callback.data or "").startswith("r|"))
async def expired_button(callback: CallbackQuery):
    await callback.answer("Эта кнопка устарела. Откройте обращение на сайте.", show_alert=True)
