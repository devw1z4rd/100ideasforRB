from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import dotenv_values

BOT_DIR = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    token: str = field(repr=False)
    chat_id: int | None
    moderator_ids: frozenset[int]
    pb_url: str
    pb_email: str = field(repr=False)
    pb_password: str = field(repr=False)
    site_url: str

    @classmethod
    def load(cls, *, setup: bool = False):
        env = dotenv_values(BOT_DIR / ".env", interpolate=False)

        def required(name):
            value = env.get(name)
            if not value:
                raise ValueError(f"Set {name} in bot/.env")
            return value

        def url(name, value):
            parsed = urlsplit(value)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.username is not None
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(f"Set {name} to an HTTP(S) URL in bot/.env")
            return value.rstrip("/")

        try:
            raw_chat_id = None if setup else env.get("TELEGRAM_CHAT_ID")
            chat_id = int(raw_chat_id) if raw_chat_id else None
            moderators = frozenset(
                int(value) for value in (env.get("TELEGRAM_MODERATOR_IDS") or "").split(",") if value.strip()
            )
        except ValueError:
            raise ValueError("Use numeric Telegram chat and moderator IDs in bot/.env") from None
        if chat_id == 0:
            raise ValueError("TELEGRAM_CHAT_ID must be a nonzero Telegram chat ID")
        if any(user_id <= 0 for user_id in moderators) or (chat_id is not None and not moderators):
            raise ValueError("Set TELEGRAM_MODERATOR_IDS to positive Telegram user IDs")
        if chat_id is not None and chat_id > 0 and chat_id not in moderators:
            raise ValueError("For a direct chat, include TELEGRAM_CHAT_ID in TELEGRAM_MODERATOR_IDS")

        return cls(
            token=required("TELEGRAM_BOT_TOKEN").strip(),
            chat_id=chat_id,
            moderator_ids=moderators,
            pb_url=url("PB_URL", env.get("PB_URL") or "http://127.0.0.1:8090"),
            pb_email=required("PB_MODERATOR_EMAIL").strip(),
            pb_password=required("PB_MODERATOR_PASSWORD"),
            site_url=url("SITE_URL", required("SITE_URL")),
        )
