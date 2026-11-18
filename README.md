# Ecological Profile of the Gomel Region

A web platform that brings together open environmental data on the Gomel Region (Belarus) and gives residents a public channel for reporting environmental problems.

Developed for the national competition *«100 ideas for Belarus»*.

---

## Abstract

Environmental information about the Gomel Region is scattered. It sits in agency reports, PDF bulletins and separate websites, is updated rarely and is seldom tied to a map. Residents have no simple way to report an illegal dump, a discharge into a river or smoke from a chimney, or to follow what happens to such a report.

This project addresses both gaps with a single public profile of the region built on continuously updated data:

1. **Ambient air quality.** Hourly values of PM2.5, PM10, NO₂, SO₂, O₃, CO and the US AQI are collected for all 21 district centres. The source is the CAMS atmospheric composition model, accessed through the Open-Meteo API, together with a 5-day forecast.
2. **Surface water.** Daily river levels come from 21 gauging stations of the Belarusian hydrometeorological service (Belhydromet), compared against each station's own thresholds. Water-quality exceedances are taken from Belhydromet's quarterly reviews.
3. **Industrial emissions.** Emissions from stationary sources come from the open data of the National Statistical Committee (Belstat).
4. **Citizen reports.** A resident can submit a geolocated report with photos in about thirty seconds, with or without an account. Each report goes through moderation and then a public status lifecycle.

Two methodological principles run through the design. First, *every figure carries its source and date*, and modelled values are labelled as such. Second, *no regional averages are shown*: instead of a single "mean AQI" for the region, the interface shows the selected town against the spread across all towns, and counts the days on which WHO guideline values were exceeded. A regional average would hide exactly the places and days that matter.

---

## Contents

1. [Problem statement and objectives](#1-problem-statement-and-objectives)
2. [Functionality](#2-functionality)
3. [System architecture](#3-system-architecture)
4. [Data sources and methodology](#4-data-sources-and-methodology)
5. [Data model](#5-data-model)
6. [Technology stack](#6-technology-stack)
7. [Repository structure](#7-repository-structure)
8. [Getting started (local development)](#8-getting-started-local-development)
9. [Testing](#9-testing)
10. [Production deployment](#10-production-deployment)
11. [Performance](#11-performance)
12. [Limitations and future work](#12-limitations-and-future-work)
13. [Licensing and attribution](#13-licensing-and-attribution)

---

## 1. Problem statement and objectives

| Audience | Need |
|---|---|
| Residents | What is the air like today; report a dump or a discharge; follow the report |
| Authorities and environmental services | Reports by district, response times |
| Industry | Regional emission trends and public accountability |
| Schools, universities, activists | Educational material and open data |

The objectives are:

- **O1.** A single map-centred profile of the region on live data, with no hand-entered or invented figures.
- **O2.** Automated, scheduled collection of air quality and river levels, so that the profile stays current without manual work.
- **O3.** A low-friction reporting channel with moderation, public statuses and real-time updates.
- **O4.** Usable on a phone in the field and on a weak laptop over a slow connection. The home page must stay usable on Slow 4G (see [§11](#11-performance)).

## 2. Functionality

**Home page (regional profile)**

- **Interactive map** (MapLibre GL). It shows the oblast with district boundaries, rivers and neighbouring regions from local GeoJSON layers, so it also works offline. On zoom it adds vector detail from OpenFreeMap. Every town is coloured by its current AQI. The map also shows citizen reports in real time, gauging stations with their level trend, and river sections with water-quality exceedances. An intro animation flies the camera from all of Belarus to the oblast.
- **Air section**, with four views:
  - *By town*: days above the WHO guideline for each pollutant, plus a daily chart of the selected town against the min–max spread of all towns;
  - *Table*: all towns at once;
  - *Forecast*: hourly AQI for ~5 days and the best three-hour window for a walk;
  - *Hourly profile*: the average diurnal cycle of a pollutant.
- **Water section**:
  - cards for all gauging stations, worst first, each with a 30-day level chart and threshold zones;
  - a dialog per station;
  - quarterly water-quality reviews presented as books on a shelf.
- **Industry section**: regional emissions of stationary sources, the share retained by treatment facilities, a ranking of regions and the national composition by pollutant.

**Other pages**

- **District comparison** (`/compare`): a choropleth and a ranking of the 22 territories by one indicator, plus a side-by-side comparison of two districts. A composite index is deliberately absent, because the indicators have different units and any weights would be arbitrary.
- **News and knowledge base** (`/news`, `/kb`): editable through the admin UI. River-situation reviews are imported from Belhydromet automatically.
- **Data and methodology** (`/data`): every source used, with publisher, licence and access date.

**Citizen reports**

- Reports are submitted at `/reports/new`. Each report has a point on the map, a category, an optional description and up to 5 photos. A form draft survives page reloads.
- An account is optional. An anonymous author receives a personal link containing a browser-generated key. Guests are rate-limited to 10 reports per 10 minutes per IP.
- The status lifecycle is: `new → accepted → forwarded → resolved`, with `rejected` possible at any step. Each transition is written to an audit trail.
- Changes appear for every visitor without a reload, through PocketBase realtime subscriptions.
- **Automatic pre-check.** A profanity filter rejects reports with obscene words; it is resistant to common obfuscations. A plausibility score with explicit reasons is shown to moderators as a hint, not as a decision.
- **Moderation queue** (`/moderation`). Photos of unmoderated reports are blurred until a moderator opens them.
- **Results showcase** (`/results`): resolved reports and the median time to resolution.

**Cross-cutting features**

- Light, dark and system themes.
- A service worker: repeat visits load code from disk, and without network the site opens with the last loaded data.

## 3. System architecture

```
                 ┌──────────────────────────── Server ────────────────────────────┐
                 │                                                                 │
 Browser ─HTTPS─▶│  Caddy  ── static frontend (precompressed .br / .gz)           │
                 │    │                                                            │
                 │    └──▶ PocketBase  /api/*  REST + realtime (SSE)               │
                 │              │      /_/     admin UI                            │
                 │              │                                                  │
                 │              ├─ pb_data/      SQLite, uploaded photos, backups   │
                 │              ├─ pb_migrations/ schema as code                    │
                 │              └─ pb_hooks/     JS hooks: cron jobs, API rules     │
                 │                               enforcement, custom routes         │
                 └─────────────────────────────────────────────────────────────────┘
                                │                 │                  │
                                ▼                 ▼                  ▼
                     Open-Meteo Air Quality   pogoda.by (river   belgidromet.by
                     (hourly)                 levels, 2×/day)    (reviews, 2×/day)
```

- **Backend.** A single PocketBase binary provides the SQLite storage, authentication, REST and realtime API, file storage, the admin UI and backups. Business rules that cannot be trusted to the client live in API rules and in JavaScript hooks (`back/pb_hooks`). These rules cover status transitions, which fields each role may change, district assignment by point-in-polygon, rate limits and the auto-check.
- **Frontend.** A single-page application served from the same origin as the API, so no CORS is needed. All data access goes through TanStack Query hooks in `front/src/api/`. Components contain no data.
- **First-screen loading.** `index.html` paints a static shell and immediately requests `GET /api/eco/home`, a single aggregated response for the first screen, while the JavaScript bundle is still downloading.

### Scheduled jobs

All schedules are in UTC.

| Job | Schedule | Purpose |
|---|---|---|
| `air_fetch` | `5 * * * *` | Hourly Open-Meteo request for all active points: recent values plus a 5-day forecast. Backfills automatically after downtime. |
| `air_daily` | `20 21 * * *` | Daily aggregates for the previous local (Minsk, UTC+3) days. Removes hourly rows older than 90 days. |
| `river_fetch` | `40 6,14 * * *` | Gauging stations in the oblast and their levels for the last 30 days. |
| `hydro_news` | `15 9,15 * * *` | Imports new Belhydromet river-situation reviews as news items. |
| `catch_up` | once after start | PocketBase does not re-run missed jobs, so this job catches up air, rivers and news after the server was down. |

### Custom API routes

| Route | Description |
|---|---|
| `GET /api/eco/home` | First-screen data in one response. It returns the same records and fields as the corresponding collection queries. |
| `GET /api/eco/reports/{id}?key=…` | A report opened through an anonymous author's personal link. A wrong key returns 404. |
| `GET /api/eco/health` | Data freshness for an uptime monitor: the newest actual air hour and river level with their age. Returns 503 when air data is older than 3 h or river levels older than 48 h, i.e. when a scheduled job has stopped delivering. |

## 4. Data sources and methodology

| Domain | Source | Acquisition | Notes |
|---|---|---|---|
| Air quality (fact and forecast) | Open-Meteo Air Quality API, CAMS model | hourly cron | **Model data**, not station measurements: grid ~10–40 km, computed for the town centre. CC BY 4.0. |
| River levels | Belhydromet, pogoda.by | cron, twice a day | Daily level at 08:00 local time, in cm above each station's gauge datum. |
| River-situation reviews | Belhydromet, belgidromet.by | cron, twice a day | Official text, imported as is, with a link to the original. |
| Surface-water quality | Belhydromet quarterly reviews, Dnieper and Pripyat basins | manual extraction each quarter → `back/seed/water/` | Only exceedances and extremes are published; Q1–Q3 2026 are included. |
| Industrial emissions | Belstat open data (dataportal.belstat.gov.by); Belstat booklets *Environmental Protection in the Republic of Belarus* (2025, 2026) | CSV exports → `back/seed/belstat/` | Available by region only; no district- or enterprise-level data is published. |
| District and oblast boundaries | OpenStreetMap via Nominatim | build scripts in `back/seed/tools/` | ODbL. |
| District centre coordinates | GeoNames | build script | CC BY 4.0. |
| Rivers, neighbouring borders | Natural Earth 1:10m | build scripts | Public domain. |
| Basemap detail on zoom | OpenFreeMap (OpenMapTiles, OSM data) | vector tiles at runtime | Not loaded at the overview zoom level. |

**Methodological decisions**

- **Air quality is judged against WHO guidelines.** The site uses the 2021 WHO 24-hour guideline values: PM2.5 15 µg/m³, PM10 45 µg/m³, NO₂ 25 µg/m³, SO₂ 40 µg/m³. Air quality is reported as *the number of days on which the daily mean exceeded the guideline*, together with the worst day.
- **Daily means use local days.** Daily means are computed over local Minsk days. A day is stored only if at least 18 of its 24 hourly values are present.
- **The AQI is shown separately.** It follows the US EPA breakpoints and appears as a distinct scale. It is based on the worst hour, so a "moderate" AQI can coexist with a day that is within WHO guidelines. The interface explains this.
- **No regional averages.** Every view shows the selected town or district against the spread across all towns.
- **River levels are only comparable within one station.** Each gauging station has its own datum, so a level is assessed only against that station's thresholds: low (navigation), floodplain and dangerous. Levels from different rivers are never compared with each other.
- **Water quality as a ratio to the norm.** Exceedance is expressed as *how many times worse than the norm* a value is. For "maximum" norms that is value / norm; for "minimum" norms, such as dissolved oxygen, it is norm / value.
- **Emissions from stationary sources.** These are computed as *generated − captured*, which is Belstat's method. For the Gomel Region this gives 108.2 kt (2023), 95.1 kt (2024) and 79.9 kt (2025), which matches published figures.
- **Citizen reports are assigned to districts by point-in-polygon.** Points outside the oblast are rejected.

## 5. Data model

The schema is defined in PocketBase and versioned as migrations in `back/pb_migrations/`. TypeScript types for the frontend are generated with `pocketbase-typegen`.

| Group | Collections |
|---|---|
| Reference | `districts` (21 districts + Gomel city, with OSM polygons), `sources` (every dataset with publisher, licence and date) |
| Air | `air_points` (21 points), `air_readings` (hourly; unique on point + timestamp), `air_daily` (daily aggregates) |
| Water | `river_posts` (gauging stations with thresholds), `river_levels` (daily; unique on station + date), `water_readings` (quarterly exceedances) |
| Industry | `emission_stats` (Belstat, by territory, year, indicator and pollutant), `enterprises`, `places` |
| Reports | `reports`, `report_events` (status history, written only by hooks) |
| Content | `news`, `articles` (knowledge base) |
| Accounts | `users`, with a `role` of `user`, `moderator` or `admin` |

**Access control.** Reference, air, water and emission collections are publicly readable and admin-writable. Reports are publicly visible only once moderated: an author sees their own reports, and moderators see all of them. Field-level permissions and valid status transitions are enforced in `back/pb_hooks/reports.pb.js`.

## 6. Technology stack

| Layer | Technology |
|---|---|
| Backend | **PocketBase 0.42.3**: SQLite, auth, REST, realtime over SSE, file storage, admin UI; JavaScript hooks run on the embedded goja engine |
| Frontend | **React 19**, **TypeScript** (strict), **Vite 8** |
| Routing and data | React Router 8, TanStack Query 5, PocketBase JS SDK |
| UI | Tailwind CSS 4, shadcn/ui on Radix primitives, Lucide icons, Motion |
| Maps | MapLibre GL 6 with react-map-gl; own GeoJSON layers; OpenFreeMap vector tiles |
| Charts | Custom SVG charts; vendored [bklit](https://ui.bklit.com) components (d3) for river levels |
| Content safety | DOMPurify for rich text from the admin editor |
| Quality | Vitest, oxlint, Prettier |
| Serving | Caddy 2: TLS, precompressed static files, API compression |

## 7. Repository structure

```
.
├── Caddyfile                 # production web server config
├── back/
│   ├── pb_hooks/             # cron jobs, hooks, custom routes, CLI commands (*.pb.js, lib/)
│   ├── pb_migrations/        # schema migrations (applied automatically on `serve`)
│   ├── seed/                 # reference data: districts, air points, sources, emissions, water, articles
│   │   ├── belstat/          # Belstat CSV exports
│   │   ├── water/            # manual extracts of quarterly water reviews
│   │   └── tools/            # scripts that rebuild seed files and map layers
│   └── tests/                # API rules and hooks tests against a running PocketBase
└── front/
    ├── index.html            # static shell and first-screen data request
    ├── sw/sw.js              # service worker (code cache and offline mode)
    ├── public/geo/           # static map layers (oblast, rivers, borders)
    └── src/
        ├── api/              # PocketBase client, generated types, query hooks per domain
        ├── components/       # map, sections, charts, reports, UI primitives
        ├── content/          # all user-facing texts (Russian)
        ├── lib/              # pure logic: statistics, geometry, formatting (unit-tested)
        ├── pages/            # route pages
        └── styles/tokens.css # design tokens (light and dark)
```

## 8. Getting started (local development)

### 8.1 Prerequisites

- **Node.js** 20.19+ or 22.12+ (required by Vite 8) and npm.
- **PocketBase 0.42.3.** Download the archive for your OS from the [PocketBase docs page](https://pocketbase.io/docs/) and put the binary into `back/`. New releases are no longer published on GitHub (the last one there is 0.40.6); the docs page links to the author's download site, which also has `checksums.txt`. PocketBase looks for `pb_hooks/`, `pb_migrations/` and `pb_data/` next to the binary. The hooks and tests are checked against 0.42.3, so use this version.

On Windows the binary is `pocketbase.exe`. Replace `./pocketbase` with `.\pocketbase.exe` in the commands below.

### 8.2 Backend: first run

Run from `back/`:

```bash
./pocketbase migrate up                                   # create the schema
./pocketbase superuser upsert admin@example.com 'change-me-please'
./pocketbase seed                                         # reference data from back/seed (idempotent)
./pocketbase air-backfill 2026-01-01                      # air history from a date (default: last 90 days), ~1 min
./pocketbase river-fetch                                  # gauging stations and 30 days of levels (after seed)
./pocketbase hydro-news                                   # latest Belhydromet river reviews
./pocketbase serve --http 127.0.0.1:8090
```

- The custom commands do not apply migrations themselves, so `migrate up` comes first.
- `seed` can be re-run after any change in `back/seed/`.
- The admin UI is available at <http://127.0.0.1:8090/_/>. Scheduled jobs can be triggered manually under *Settings → Crons*.

To make a user a moderator, register them on the site first, then run:

```bash
./pocketbase set-role moderator@example.com moderator    # roles: user, moderator, admin
```

### 8.3 Frontend

Run from `front/`:

```bash
npm ci
npm run dev                # http://localhost:5173, proxies /api and /_/ to 127.0.0.1:8090
```

Other scripts:

| Command | Purpose |
|---|---|
| `npm run build` | Type-check and build into `front/dist` (with `.br` / `.gz` files and the service worker) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests |
| `npm run lint` | oxlint |
| `npm run format` | Prettier |
| `npm run typegen` | Regenerate `src/api/pocketbase-types.ts` from the local `back/pb_data` after a schema change |

The service worker is installed only in production builds. `npm run preview` installs it on the preview port; to remove it, use DevTools → Application → Service workers → Unregister.

### 8.4 Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_PB_URL` | frontend build | PocketBase URL when the frontend is not served from the API origin (default `/`) |
| `VITE_SITE_URL` | frontend build | Site address, e.g. `https://eco.example.by`, for the absolute `og:image` URL in link previews. Without it the URL stays relative and the build warns |
| `AIR_API_URL` | PocketBase | Overrides the Open-Meteo host (tests, proxy) |
| `RIVER_API_URL` | PocketBase | Overrides the pogoda.by host |
| `BELGIDROMET_URL` | PocketBase | Overrides the belgidromet.by host |
| `SITE_ADDRESS`, `PB_UPSTREAM`, `SITE_ROOT` | Caddy | Domain, PocketBase address, frontend build directory |

### 8.5 Rebuilding seed data and map layers

The scripts in `back/seed/tools/` rebuild the committed data files. They are needed only when sources change.

```bash
node back/seed/tools/build-districts.mjs     # district polygons (OSM) and centres (GeoNames)
node back/seed/tools/build-emissions.mjs     # Belstat CSV → emission_stats.json
node back/seed/tools/build-water.mjs         # quarterly water extracts → water_readings.json
node back/seed/tools/build-map-geo.mjs       # oblast outline and rivers → front/public/geo/
node back/seed/tools/build-map-borders.mjs   # neighbouring borders → front/public/geo/borders.geojson
```

Behind a proxy, prefix the network-bound scripts with `NODE_USE_ENV_PROXY=1`. After rebuilding, run `./pocketbase seed` again.

## 9. Testing

| Suite | Command | Requires |
|---|---|---|
| Frontend unit tests (statistics, geometry, formatting, routes) | `cd front && npm test` | — |
| Data hooks against a real backend | `cd front && PB_TEST_URL=http://127.0.0.1:8090 PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… npx vitest run src/api` | A running PocketBase after the first-run steps in [§8.2](#82-backend-first-run) |
| API rules and hooks, as anonymous / user / moderator / admin | `PB_URL=http://127.0.0.1:8090 PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… node --test back/tests/rules.test.mjs` | A running PocketBase with migrations, hooks and seed data |

The integration suites create their own records and delete them at the end. Without `PB_TEST_URL`, the frontend integration tests are skipped.

The schema enables PocketBase's default rate limits, including 2 sign-ins per 3 s per IP, and the suites sign in several users in a row. Locally, exclude `127.0.0.1` from rate limiting for the test run (`rateLimits.excludedIPs` in the settings, e.g. via `PATCH /api/settings` as a superuser) and clear it afterwards, and run the two suites one after the other, not in parallel.

## 10. Production deployment

The target is a small Linux VPS: 1 vCPU, 1–2 GB RAM, Ubuntu 24.04.

1. **Build the frontend:** `cd front && npm ci && VITE_SITE_URL=https://<domain> npm run build`.
2. **Copy to the server:**
   - `back/pb_hooks/`, `back/pb_migrations/` and `back/seed/`;
   - the PocketBase 0.42.3 binary for Linux, placed next to them;
   - `front/dist/`, which becomes `SITE_ROOT`.
3. **Run PocketBase as a service**, listening on localhost only. Migrations are applied automatically on `serve`. A minimal systemd unit:

   ```ini
   [Unit]
   Description=PocketBase (eco profile)
   After=network.target

   [Service]
   WorkingDirectory=/srv/eco/back
   ExecStart=/srv/eco/back/pocketbase serve --http 127.0.0.1:8090
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

4. **Run the one-time data initialisation** from [§8.2](#82-backend-first-run): superuser, `seed`, `air-backfill`, `river-fetch`, `hydro-news`.
5. **Start Caddy** with the repository `Caddyfile`. Caddy obtains TLS certificates automatically and serves the precompressed static files with long-lived caching for hashed assets. It proxies `/api/*` and `/_/*` to PocketBase and compresses API responses on the fly, which PocketBase does not do itself.

   ```bash
   SITE_ADDRESS=eco.example.by PB_UPSTREAM=127.0.0.1:8090 SITE_ROOT=/srv/eco/site caddy run --config Caddyfile
   ```

6. **Trusted proxy and backups are set by a migration** (`1795039674_settings_proxy_backups.js`). PocketBase takes the client IP from `X-Forwarded-For`, which Caddy overwrites with the real one; without this, every guest would have Caddy's IP and the per-IP rate limits would apply to the whole site. Backups run daily at 02:30 Minsk and the last 7 are kept in `pb_data/backups`. **Copy them off the server** yourself, to S3-compatible storage (*Settings → Backups*) or another host.
7. **Set up an uptime monitor** on `https://<domain>/api/eco/health`, with an alert on any non-2xx response, in any external service that can notify Telegram or e-mail. The endpoint returns 503 when air data or river levels stop arriving.

Alternatively, the content of `front/dist` can be placed into `back/pb_public/` and served by PocketBase directly. The site works this way, but without brotli and without immutable caching of assets. In this mode PocketBase faces clients directly, so remove the `X-Forwarded-For` header under *Settings → Application → Trusted proxy*: otherwise a client can send the header itself and get around the rate limits.

## 11. Performance

Measurements were taken on 16 Nov 2026 with a production build, compression as configured in the `Caddyfile`, Chrome network throttling and a cold cache.

| Network | First paint (shell) | Interface ready | Map ready |
|---|---|---|---|
| Fast 4G | 0.2 s | 1.0 s | 1.7 s |
| Slow 4G | 0.6 s | 3.1 s | 6.9 s |
| 3G | 2.1 s | 10.7 s | 24 s; an SVG preview of the oblast from 14 s |

On Slow 4G the original single-bundle build took 3.2 s to the interface and ~11 s to the map. About 240 KB are transferred before the interface is ready and about 860 KB before the map is ready (MapLibre with its worker accounts for 360 KB).

The main techniques were:

- a static HTML shell with stylesheets moved out of `<head>`;
- one aggregated first-screen request issued from `index.html`;
- parallel download of the map chunk and its worker;
- an SVG map preview on slow networks;
- lazy chunks for the sections below the map;
- precompressed brotli and gzip assets;
- a service worker for repeat visits.

The map intro animation was profiled separately on a throttled CPU. The flight frame time dropped from 39–56 ms to 16–18 ms, mostly by avoiding `step` expressions in MapLibre line gradients and by mounting HTML markers only after the flight.

## 12. Limitations and future work

- **Modelled air data.** CAMS values describe a ~10–40 km grid cell, not a measurement at a station. Integrating official monitoring data from Belhydromet depends on its availability in machine-readable form.
- **No enterprise- or district-level emissions.** These figures are not published, so the industry section stays at the regional level.
- **Manual quarterly extraction.** Water-quality data is extracted from Belhydromet's reviews by hand each quarter.
- **Photos are processed in the browser only.** Before upload the report form re-encodes each photo as JPEG of at most 2048 px, which also removes EXIF metadata, including location. A browser that cannot decode the format (HEIC outside Safari) uploads the original as is, and the server does not re-check it, because PocketBase hooks have no image library.
- **Open items before production:**
  - the `Caddyfile` has been checked locally with Caddy 2.11.9 (compression, caching, SPA fallback, realtime, client IP), but not yet on a production host;
  - docker-compose and CI/CD are not part of the repository yet.
- **Planned:**
  - a Telegram bot for reports and AQI alerts;
  - a calendar heatmap of AQI;
  - a dashboard for authorities (response times by district);
  - a public API and CSV export;
  - a Belarusian-language interface.

## 13. Licensing and attribution

No licence has been chosen for the project code yet.

Third-party data and code used by the project:

- Air quality: [Open-Meteo](https://open-meteo.com/), CAMS model data, CC BY 4.0.
- Map data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
- Vector tiles: [OpenFreeMap](https://openfreemap.org/), © OpenMapTiles.
- Geographic names and coordinates: [GeoNames](https://www.geonames.org/), CC BY 4.0.
- Rivers and borders: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- River levels and hydrological reviews: [Belhydromet](https://belgidromet.by/) ([pogoda.by](https://pogoda.by/)). The sources are cited on the site as their terms require.
- Emissions: [Belstat](https://www.belstat.gov.by/), open data portal and statistical publications.
- Chart components: vendored from [bklit](https://ui.bklit.com). Pattern components are derived from visx (MIT, see `front/src/components/charts/patterns/LICENSE-visx-pattern`).

The concept and section structure originate from the static prototype [kvaykl1/100ideasforRB](https://github.com/kvaykl1/100ideasforRB).
