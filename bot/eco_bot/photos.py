import logging

from aiogram.exceptions import TelegramBadRequest
from aiogram.types import BufferedInputFile, InputMediaDocument, InputMediaPhoto, ReplyParameters

from .pocketbase import PocketBaseError

log = logging.getLogger(__name__)


async def send_report_photos(bot, pocketbase, chat_id, message_id, report, filenames):
    attachments = []
    for filename in filenames:
        try:
            contents = await pocketbase.report_photo(report, filename)
        except PocketBaseError as error:
            if error.status != 404:
                raise
            log.warning("A photo for report %s is missing in PocketBase", report["id"])
            continue
        attachments.append(BufferedInputFile(contents, filename=filename))
    if not attachments:
        return

    options = {
        "chat_id": chat_id,
        "protect_content": True,
        "disable_notification": True,
        "reply_parameters": ReplyParameters(message_id=message_id, allow_sending_without_reply=True),
    }
    try:
        if len(attachments) == 1:
            await bot.send_photo(photo=attachments[0], **options)
        else:
            await bot.send_media_group(media=[InputMediaPhoto(media=file) for file in attachments], **options)
    except TelegramBadRequest:
        # Keep formats Telegram cannot preview, such as HEIC, available as attachments.
        if len(attachments) == 1:
            await bot.send_document(document=attachments[0], **options)
        else:
            await bot.send_media_group(media=[InputMediaDocument(media=file) for file in attachments], **options)
