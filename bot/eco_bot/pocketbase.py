import asyncio
from time import monotonic
from urllib.parse import quote


class PocketBaseError(Exception):
    def __init__(self, status: int):
        self.status = status
        super().__init__(f"PocketBase returned HTTP {status}")


class PocketBase:
    def __init__(self, session, settings):
        self.session = session
        self.settings = settings
        self.token = ""
        self.refresh_at = 0.0
        self.login_lock = asyncio.Lock()

    async def login(self):
        async with self.login_lock:
            if monotonic() < self.refresh_at:
                return
            result = await self._request(
                "POST",
                "/api/collections/users/auth-with-password",
                json={"identity": self.settings.pb_email, "password": self.settings.pb_password},
            )
            if result["record"]["role"] != "moderator":
                raise ValueError("The bot's PocketBase account must have the moderator role")
            self.token = result["token"]
            self.refresh_at = monotonic() + 15 * 60

    async def _request(self, method, route, *, as_bytes=False, **options):
        async with self.session.request(method, f"{self.settings.pb_url}{route}", **options) as response:
            if response.status >= 400:
                raise PocketBaseError(response.status)
            if as_bytes:
                return await response.read()
            return await response.json()

    async def request(self, method, route, **options):
        await self.login()
        token = self.token
        try:
            return await self._request(method, route, headers={"Authorization": token}, **options)
        except PocketBaseError as error:
            if error.status != 401:
                raise
            if token == self.token:
                self.refresh_at = 0.0
            await self.login()
            return await self._request(method, route, headers={"Authorization": self.token}, **options)

    async def report(self, report_id):
        return await self.request(
            "GET", f"/api/collections/reports/records/{report_id}", params={"expand": "district"}
        )

    async def report_photo(self, report, filename):
        segments = (report["collectionId"], report["id"], filename)
        path = "/".join(quote(value, safe="") for value in segments)
        return await self.request("GET", f"/api/files/{path}", as_bytes=True)

    async def change_status(self, report_id, status):
        return await self.request(
            "PATCH", f"/api/collections/reports/records/{report_id}", json={"status": status}
        )

    async def report_creations(self, started_at, cursor):
        filter_parts = [f'from_status = "" && (report.status = "new" || created >= "{started_at}")']
        if cursor:
            created, event_id = cursor
            filter_parts.append(f'(created > "{created}" || (created = "{created}" && id > "{event_id}"))')
        result = await self.request(
            "GET",
            "/api/collections/report_events/records",
            params={
                "filter": " && ".join(filter_parts),
                "sort": "created,id",
                "perPage": 50,
                "skipTotal": "true",
                "expand": "report.district",
                "fields": "id,created,report,expand.report.id,expand.report.collectionId,expand.report.created,"
                          "expand.report.category,expand.report.status,expand.report.description,"
                          "expand.report.location,expand.report.photos,expand.report.expand.district.name",
            },
        )
        return result["items"]
