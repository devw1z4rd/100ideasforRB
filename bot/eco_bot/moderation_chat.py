import logging
from dataclasses import dataclass

from aiogram.enums import ChatType
from aiogram.exceptions import TelegramMigrateToChat

log = logging.getLogger(__name__)


def is_private_group(chat):
    return chat.type in {ChatType.GROUP, ChatType.SUPERGROUP} and not (chat.username or chat.active_usernames)


@dataclass
class ModerationChat:
    id: int | None

    async def resolve(self, bot):
        try:
            chat = await bot.get_chat(self.id)
            if chat.type == ChatType.GROUP:
                # Telegram can still return the old group from getChat after an upgrade.
                await bot.get_chat_member_count(self.id)
        except TelegramMigrateToChat as error:
            await self.migrate(bot, error.migrate_to_chat_id)
            return

        if chat.id != self.id or (chat.type != ChatType.PRIVATE and not is_private_group(chat)):
            raise ValueError("TELEGRAM_CHAT_ID must point to a private group or an authorized direct chat")

    async def migrate(self, bot, new_id: int):
        chat = await bot.get_chat(new_id)
        if new_id == self.id or chat.id != new_id or chat.type != ChatType.SUPERGROUP or not is_private_group(chat):
            raise ValueError(f"Telegram migration destination {new_id} is not a private supergroup")
        log.info("Telegram group %s moved to %s. Set TELEGRAM_CHAT_ID=%s in bot/.env.", self.id, new_id, new_id)
        self.id = new_id
