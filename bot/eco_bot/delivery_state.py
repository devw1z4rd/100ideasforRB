import asyncio
import json
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime

from .config import BOT_DIR

STATE_PATH = BOT_DIR / ".state.json"


@dataclass
class PendingPhotos:
    event_id: str
    chat_id: int
    message_id: int
    next_photo: int = 0


@dataclass
class ReportCard:
    chat_id: int
    message_id: int
    status: str | None = None
    duplicate_of: str = ""


@dataclass
class DeliveryState:
    started_at: str
    cursor: tuple[str, str] | None
    legacy_ids: set[str]
    pending_photos: PendingPhotos | None = None
    status_cursor: tuple[str, str] | None = None
    cards: dict[str, ReportCard] = field(default_factory=dict)
    card_lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False)

    @classmethod
    def load(cls):
        try:
            data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except FileNotFoundError:
            data = {}
        now = datetime.now(UTC).isoformat(sep=" ", timespec="milliseconds").replace("+00:00", "Z")
        pending = data.get("pending_photos")
        return cls(
            started_at=data.get("started_at", now),
            cursor=tuple(data["cursor"]) if data.get("cursor") else None,
            legacy_ids=set(data.get("notifiedReports", [])),
            pending_photos=PendingPhotos(**pending) if pending else None,
            status_cursor=tuple(data["status_cursor"]) if data.get("status_cursor") else (now, ""),
            cards={report_id: ReportCard(**card) for report_id, card in data.get("cards", {}).items()},
        )

    def save(self):
        data = {
            "started_at": self.started_at,
            "cursor": self.cursor,
            "notifiedReports": sorted(self.legacy_ids),
            "pending_photos": asdict(self.pending_photos) if self.pending_photos else None,
            "status_cursor": self.status_cursor,
            "cards": {report_id: asdict(card) for report_id, card in self.cards.items()},
        }
        temporary = STATE_PATH.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(data), encoding="utf-8")
        temporary.replace(STATE_PATH)
