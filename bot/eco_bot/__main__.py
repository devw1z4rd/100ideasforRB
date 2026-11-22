import asyncio
import logging
from argparse import ArgumentParser
from urllib.parse import urlsplit

from aiohttp import ClientError, ClientSession, ClientTimeout
from aiogram import Bot, Dispatcher
from aiogram.exceptions import (
    TelegramAPIError,
    TelegramBadRequest,
    TelegramUnauthorizedError,
)
from aiogram.utils.token import TokenValidationError

from .card_updates import CardUpdates
from .config import Settings
from .delivery_state import DeliveryState
from .handlers import router
from .moderation_chat import ModerationChat
from .notifications import forward_reports
from .pocketbase import PocketBase, PocketBaseError
from .report_cards import LOOPBACK_HOSTS


async def main(*, setup: bool):
    settings = Settings.load(setup=setup)
    moderation_chat = ModerationChat(settings.chat_id)
    dispatcher = Dispatcher()
    dispatcher.include_router(router)

    async with Bot(settings.token) as bot, ClientSession(timeout=ClientTimeout(total=10)) as session:
        pocketbase = PocketBase(session, settings)
        if moderation_chat.id is not None:
            try:
                await moderation_chat.resolve(bot)
            except TelegramBadRequest as error:
                reason = error.message.replace(settings.token, "[redacted]")
                hint = ""
                if "chat not found" in reason.lower():
                    hint = " Add this bot to the group, then use --setup and /chatid@your_bot_username to check its ID."
                raise ValueError(f"Telegram chat check failed: {reason}.{hint}") from None
            await pocketbase.login()
            state = DeliveryState.load()
            if urlsplit(settings.site_url).hostname in LOOPBACK_HOSTS:
                logging.warning("SITE_URL points to this computer. Use a reachable frontend URL for links on other devices.")
        else:
            state = None
            logging.info("Setup mode. Use /id or /chatid to look up Telegram IDs.")

        card_updates = CardUpdates(bot, pocketbase, settings.site_url, moderation_chat, state) if state else None
        async with asyncio.TaskGroup() as tasks:
            delivery = tasks.create_task(forward_reports(bot, pocketbase, settings, moderation_chat, state)) if state else None
            sync = tasks.create_task(card_updates.poll()) if card_updates else None
            try:
                await dispatcher.start_polling(
                    bot,
                    settings=settings,
                    moderation_chat=moderation_chat,
                    card_updates=card_updates,
                    pocketbase=pocketbase,
                    handle_as_tasks=False,
                    close_bot_session=False,
                )
            finally:
                if delivery:
                    delivery.cancel()
                if sync:
                    sync.cancel()


if __name__ == "__main__":
    parser = ArgumentParser(description="Run the Eco Telegram moderation bot")
    parser.add_argument("--setup", action="store_true", help="Answer ID lookup commands without forwarding reports")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        asyncio.run(main(setup=args.setup))
    except TokenValidationError:
        raise SystemExit("Invalid TELEGRAM_BOT_TOKEN in bot/.env") from None
    except TelegramUnauthorizedError:
        raise SystemExit("Telegram rejected TELEGRAM_BOT_TOKEN in bot/.env") from None
    except TelegramAPIError as error:
        raise SystemExit(f"Telegram startup failed ({type(error).__name__}). Check the token and chat.") from None
    except (PocketBaseError, ClientError, TimeoutError) as error:
        raise SystemExit(f"PocketBase startup failed ({type(error).__name__}). Check PB_URL and credentials.") from None
    except ValueError as error:
        raise SystemExit(str(error)) from None
