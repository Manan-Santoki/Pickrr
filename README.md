# Pickrr

Pickrr is a self-hostable app for manual torrent selection:

`TMDB search -> Prowlarr results -> qBittorrent download`

No Overseerr webhooks, no Radarr/Sonarr handoff, no Redis/BullMQ workers.

## Stack

- Next.js 14 + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth (credentials)

## App Flow

1. Search TMDB from `/`
2. Open `/movie/[id]` or `/tv/[id]`
3. Search Prowlarr torrents for that title
4. Click **Grab** to send to qBittorrent (category: `movies` or `tv`)
5. Track progress in `/downloads`

## Core Routes

### Pages

- `/` - TMDB search
- `/movie/[id]` - movie detail + torrent picker
- `/tv/[id]` - TV detail + torrent picker
- `/downloads` - active and completed downloads
- `/settings` - service config (admin)
- `/login` - username/password login

### API

- `GET /api/tmdb/search?query=X&type=movie|tv|multi`
- `GET /api/tmdb/[id]?type=movie|tv`
- `GET /api/torrents/search?query=X&type=movie|tv`
- `POST /api/download`
- `GET /api/downloads`
- `GET /api/downloads/[id]`
- `GET /api/qbit/status`
- `GET /api/settings`
- `PUT /api/settings`

## Environment

See `.env.example`.

Required integrations:

- `DATABASE_URL` (optional, external PostgreSQL)
- `PROWLARR_URL`, `PROWLARR_API_KEY`
- `QBIT_URL`, `QBIT_USERNAME`, `QBIT_PASSWORD`
- `TMDB_API_KEY`

Path config:

- `MOVIES_SAVE_PATH` (default `/downloads/movies`)
- `TV_SAVE_PATH` (default `/downloads/tv`)
- `JELLYFIN_URL` (optional, enables Jellyfin login on `/login`)

Note: environment variables take priority over values saved in Settings UI.

## Docker

`docker-compose.yml` runs:

- `pickrr` app container
- `postgres` database container

Both services run on `dokploy-network`.

Database behavior:

- If `DATABASE_URL` is set, Pickrr uses that URL (external/managed Postgres).
- If `DATABASE_URL` is empty, Pickrr auto-builds it from `POSTGRES_*` and uses bundled `postgres` service.

## Development

```bash
npm install
npx prisma generate
npm run db:migrate
npm run dev
```

## Production Build Check

```bash
npm run lint
npm run build
```
