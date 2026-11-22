# Telegram moderation bot

The bot checks PocketBase for new report creation events every 2.5 seconds. Each notification includes the current status, category, district, description, a Yandex Maps point link, the date and time in Minsk, and access to the report. The bot uploads a single photo as a reply and groups multiple photos into one Telegram album. Buttons show the available status changes. Previously submitted reports still awaiting moderation are picked up on the first run.

The bot runs on Python 3.11+ using aiogram and aiohttp. In `eco_bot/`, `config.py` loads settings, `pocketbase.py` handles API access, `notifications.py` resumes and forwards report events, `report_cards.py` builds the Telegram cards, `photos.py` uploads attachments, and `handlers.py` handles commands and status changes. `__main__.py` runs both polling loops.

## Authentication and status changes

- Only Telegram numeric user IDs listed in `TELEGRAM_MODERATOR_IDS` can use moderation buttons.
- Actions are accepted only from `TELEGRAM_CHAT_ID`.
- If Telegram upgrades that group to a supergroup, the bot verifies the replacement chat is private, switches to its ID, and retries pending delivery. The log shows the new ID to save in `.env`.
- The bot signs in to PocketBase with a dedicated `users` account whose role is `moderator`. Do not use a PocketBase superuser account.
- PocketBase enforces the status transitions and records changes under the bot’s moderator account. The bot logs the acting Telegram user ID on the server. The reporter follows the status on the website.
- To reject a report, press **Отклонить** and reply to the bot’s prompt with a reason. The author sees it in the report history. A prompt expires after 15 minutes or a bot restart. Use `/cancel` to clear it.

## Configure locally

Keep your existing `bot/.env`. For a fresh setup, copy `.env.example`, use a private Telegram group or a direct chat with an allowlisted moderator, and give the dedicated PocketBase user the `moderator` role with `pocketbase set-role <email> moderator`. Use a replacement token if the original was shared.

From the repository root in PowerShell:

```powershell
cd bot
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m eco_bot
```

On Linux, use `python3 -m venv .venv` and `.venv/bin/python` for the last two commands.

The website button opens the report after sign-in. For a localhost URL the bot offers a copy button, so you can paste the link into a browser on the development computer. For another device on the same network, run Vite with `npm run dev -- --host <computer-LAN-IP>` and set `SITE_URL=http://<computer-LAN-IP>:5173`. Local HTTP links also have a copy button for clients that block opening them directly. Once deployed, use the site's HTTPS address. Photo uploads use `PB_URL` and work with a local PocketBase address.

If Telegram reports `chat not found`, check that the bot from your token is a member of the group. From `bot/`, run `.\.venv\Scripts\python.exe -m eco_bot --setup` in PowerShell or `.venv/bin/python -m eco_bot --setup` on Linux. Send `/chatid@your_bot_username` in the group, copy the returned `ID чата` into `TELEGRAM_CHAT_ID`, and restart without `--setup`. In a direct chat, `/id` returns your Telegram user ID. Leaving `TELEGRAM_CHAT_ID` blank also starts setup mode.

## Production

Run one supervised bot process alongside PocketBase. Set `PB_URL` to the private PocketBase address and `SITE_URL` to the website address reachable by moderators. Telegram long polling needs outbound HTTPS. Keep the ignored `.env` and `.state.json` on persistent storage. The state file stores the delivery cursor. A crash after Telegram accepts a message and before the cursor is saved can result in a duplicate notification.

The bot also stores Telegram message IDs and checks PocketBase for moderation events. Changing a report's status on the website refreshes the original card and its action buttons. Linking a duplicate on the website marks its Telegram card and removes its status buttons. To connect a card posted before this feature, an allowlisted moderator can reply to that card with `/sync@your_bot_username` once.
