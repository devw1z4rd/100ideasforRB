import logging
import re
from time import monotonic

from aiohttp import ClientError
from aiogram import Bot, F, Router, html
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, ForceReply, Message

from .card_updates import CardUpdates
from .config import Settings
from .moderation_chat import ModerationChat
from .pocketbase import PocketBase, PocketBaseError
from .report_cards import ModerationAction, STATUS_LABELS, TRANSITIONS

log = logging.getLogger(__name__)
router = Router()
REASON_LIMIT = 1000
PROMPT_TIMEOUT = 15 * 60


class Rejection(StatesGroup):
    reason = State()


async def refresh_card(card_updates: CardUpdates, report_id: str):
    try:
        return await card_updates.refresh(report_id)
    except (ClientError, PocketBaseError, TelegramAPIError, TimeoutError) as error:
        log.warning("Could not refresh Telegram card for %s (%s)", report_id, type(error).__name__)
        return False


async def ask_rejection_reason(message: Message, callback: CallbackQuery, action: ModerationAction, state: FSMContext):
    user = callback.from_user
    mention = html.link(user.full_name, f"tg://user?id={user.id}")
    prompt = await message.reply(
        f"{mention}, ответьте на это сообщение и укажите причину отклонения обращения #{action.report_id}. "
        f"Автор увидит её в истории. До {REASON_LIMIT} символов.",
        parse_mode=ParseMode.HTML,
        reply_markup=ForceReply(selective=True),
    )
    await state.set_data({
        "report_id": action.report_id,
        "from_status": action.current,
        "prompt_id": prompt.message_id,
        "expires_at": monotonic() + PROMPT_TIMEOUT,
    })
    await state.set_state(Rejection.reason)


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


@router.message(Command("sync"))
async def sync_existing_card(message: Message, bot: Bot, settings: Settings, moderation_chat: ModerationChat,
                             card_updates: CardUpdates | None):
    if (card_updates is None or message.chat.id != moderation_chat.id
        or not message.from_user or message.from_user.id not in settings.moderator_ids):
        return
    original = message.reply_to_message
    if not original or not original.from_user or original.from_user.id != bot.id:
        await message.reply("Ответьте командой /sync на карточку обращения от бота.")
        return
    match = re.match(r"📩 Получено (?:новое )?обращение #([a-z0-9]{15})(?:\n|$)", original.text or "")
    if not match:
        await message.reply("Ответьте командой /sync на карточку обращения от бота.")
        return
    report_id = match[1]
    await card_updates.remember(report_id, original, replace=True)
    if await refresh_card(card_updates, report_id):
        await message.reply("Карточка обновлена. Статус будет синхронизироваться с сайтом.")
    else:
        await message.reply("Не удалось обновить карточку.")


@router.callback_query(ModerationAction.filter())
async def moderate(
    callback: CallbackQuery,
    callback_data: ModerationAction,
    settings: Settings,
    moderation_chat: ModerationChat,
    pocketbase: PocketBase,
    state: FSMContext,
    card_updates: CardUpdates | None,
):
    message = callback.message
    if (
        card_updates is None
        or not isinstance(message, Message)
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
        await card_updates.remember(action.report_id, message)
        report = await pocketbase.report(action.report_id)
        if report.get("duplicate_of"):
            response = "Статус меняется в основном обращении"
        elif report["status"] == action.current:
            if action.target == "rejected":
                await ask_rejection_reason(message, callback, action, state)
                await callback.answer()
                return
            changed = await pocketbase.change_status(action.report_id, action.target)
            report["status"] = changed["status"]
            log.info("Telegram moderator %s changed report %s to %s", callback.from_user.id, action.report_id, report["status"])
            response = "Статус изменён"
        else:
            response = "Статус уже изменился"
    except (ClientError, PocketBaseError, TelegramAPIError, TimeoutError) as error:
        log.warning("Could not update report %s (%s)", action.report_id, type(error).__name__)
        await callback.answer("Не удалось обновить обращение. Попробуйте ещё раз.", show_alert=True)
        return

    try:
        await callback.answer(f"{response}: {STATUS_LABELS[report['status']]}.")
    finally:
        await refresh_card(card_updates, action.report_id)


@router.message(Rejection.reason, Command("cancel"))
async def cancel_rejection(message: Message, state: FSMContext):
    await state.clear()
    await message.reply("Отклонение отменено.")


@router.message(Rejection.reason, F.reply_to_message)
async def reject_with_reason(
    message: Message,
    state: FSMContext,
    settings: Settings,
    moderation_chat: ModerationChat,
    pocketbase: PocketBase,
    card_updates: CardUpdates | None,
):
    if (
        card_updates is None
        or message.chat.id != moderation_chat.id
        or message.sender_chat is not None
        or message.from_user is None
        or message.from_user.id not in settings.moderator_ids
    ):
        return

    request = await state.get_data()
    if message.reply_to_message.message_id != request.get("prompt_id"):
        return
    if monotonic() >= request["expires_at"]:
        await state.clear()
        await message.reply("Запрос устарел. Нажмите «Отклонить» ещё раз.")
        return

    reason = (message.text or "").strip()
    if not reason or len(reason) > REASON_LIMIT:
        await message.reply(f"Ответьте на запрос текстом от 1 до {REASON_LIMIT} символов.")
        return

    report_id = request["report_id"]
    try:
        report = await pocketbase.report(report_id)
        if report.get("duplicate_of"):
            response = "Обращение стало повторным. Измените статус в основном обращении."
        elif report["status"] == request["from_status"]:
            changed = await pocketbase.change_status(report_id, "rejected", comment=reason)
            report["status"] = changed["status"]
            log.info("Telegram moderator %s rejected report %s", message.from_user.id, report_id)
            response = "Обращение отклонено. Причина сохранена в истории."
        else:
            response = f"Статус уже изменился: {STATUS_LABELS[report['status']]}."
    except (ClientError, PocketBaseError, TimeoutError) as error:
        log.warning("Could not reject report %s (%s)", report_id, type(error).__name__)
        await message.reply("Не удалось отклонить обращение. Попробуйте ответить на запрос ещё раз.")
        return

    await state.clear()
    await refresh_card(card_updates, report_id)
    await message.reply(response)


@router.callback_query(lambda callback: (callback.data or "").startswith("r|"))
async def expired_button(callback: CallbackQuery):
    await callback.answer("Эта кнопка устарела. Откройте обращение на сайте.", show_alert=True)
