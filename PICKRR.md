# Pickrr 🎬
### Open Source Torrent Selection Layer for the *arr Ecosystem
> Self-hostable · Overseerr-integrated · Prowlarr-powered · qBittorrent-native

---

## The Problem

The *arr ecosystem has a gap. When a user requests media on Overseerr, the
pipeline is fully automated — Radarr/Sonarr picks a torrent based on quality
profiles, sends it to qBittorrent, and the user has zero visibility or control
over which specific release gets downloaded. Power users want to:

- Choose a specific uploader or release group (YTS, FLUX, CMRG, etc.)
- Pick the right file size for their storage constraints
- Avoid low-seed or suspicious torrents
- Select between 1080p HEVC vs 4K Remux for a specific title

No polished open source tool solves this today. **Pickrr fills that gap.**

---

## What Pickrr Does

1. User requests media on **Overseerr** as normal
2. Instead of Radarr/Sonarr auto-grabbing, Overseerr fires a **webhook** to Pickrr
3. Pickrr queries **Prowlarr** for top results across all configured indexers
4. An **admin/user-facing UI** shows results ranked by seeders, size, indexer, uploader
5. User (or admin) selects their preferred torrent
6. Pickrr sends it directly to **qBittorrent** with the correct save path
7. Radarr/Sonarr is notified to **import** the completed download

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                               │
│                                                                 │
│   Overseerr  ──webhook──►  Pickrr UI  ◄──── Direct Search      │
│   (request)                   │              (optional)         │
└───────────────────────────────┼─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      PICKRR CORE                                │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │  Next.js    │   │  API Layer   │   │   Queue / Worker    │  │
│  │  Frontend   │◄──│  (REST)      │──►│   (BullMQ/Redis)    │  │
│  └─────────────┘   └──────┬───────┘   └─────────────────────┘  │
│                           │                                     │
│  ┌─────────────────────────▼───────────────────────────────┐    │
│  │                   Service Layer                          │    │
│  │  ProwlarrService │ QbitService │ ArrService │ TMDBService│    │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Database (SQLite)                      │   │
│  │  requests │ selections │ users │ settings │ history      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│                                                                 │
│   Prowlarr        qBittorrent       Radarr / Sonarr             │
│   (search)        (download)        (import + organize)         │
│                                                                 │
│   Overseerr       TMDB API          Jellyfin                    │
│   (requests)      (metadata)        (media server)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR, fast, you know it |
| Backend | Next.js API Routes | Monorepo simplicity |
| Database | SQLite via Prisma | Zero-dependency, self-hostable |
| Queue | BullMQ + Redis | Async webhook processing |
| Auth | NextAuth.js | Easy, supports Overseerr OAuth |
| Styling | Tailwind CSS + shadcn/ui | Fast beautiful UI |
| Metadata | TMDB API | Posters, ratings, descriptions |
| Container | Docker + Docker Compose | Self-hostable |

---

## Project Structure

```
pickrr/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Home — pending requests
│   │   │   ├── search/page.tsx       # Manual search
│   │   │   ├── history/page.tsx      # Download history
│   │   │   └── settings/page.tsx     # Admin settings
│   │   └── api/
│   │       ├── webhook/
│   │       │   └── overseerr/route.ts   # Overseerr webhook receiver
│   │       ├── search/route.ts          # Prowlarr search proxy
│   │       ├── download/route.ts        # Send to qBittorrent
│   │       ├── requests/route.ts        # Pending request list
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── TorrentResultCard.tsx     # Single torrent result row
│   │   ├── TorrentResultList.tsx     # Results table
│   │   ├── RequestCard.tsx           # Pending request card
│   │   ├── SearchBar.tsx
│   │   ├── DownloadProgress.tsx      # qBit progress tracker
│   │   └── MediaPoster.tsx           # TMDB poster + metadata
│   ├── services/
│   │   ├── prowlarr.ts               # Prowlarr API client
│   │   ├── qbittorrent.ts            # qBittorrent Web API client
│   │   ├── radarr.ts                 # Radarr API client
│   │   ├── sonarr.ts                 # Sonarr API client
│   │   ├── overseerr.ts              # Overseerr API client
│   │   └── tmdb.ts                   # TMDB metadata client
│   ├── lib/
│   │   ├── db.ts                     # Prisma client
│   │   ├── queue.ts                  # BullMQ setup
│   │   └── auth.ts                   # NextAuth config
│   └── workers/
│       └── webhook.worker.ts         # Background webhook processor
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Database Schema (Prisma)

```prisma
model Request {
  id              String    @id @default(cuid())
  overseerrId     Int       @unique
  tmdbId          Int
  mediaType       String    // "movie" | "tv"
  title           String
  year            Int?
  posterPath      String?
  status          String    // "pending" | "selected" | "downloading" | "done" | "failed"
  requestedBy     String    // Overseerr username
  selectedTorrent Torrent?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Torrent {
  id          String   @id @default(cuid())
  requestId   String   @unique
  request     Request  @relation(fields: [requestId], references: [id])
  title       String
  indexer     String
  size        BigInt
  seeders     Int
  leechers    Int
  infoUrl     String?
  downloadUrl String
  magnetUrl   String?
  qbitHash    String?  // qBittorrent torrent hash after sending
  selectedAt  DateTime @default(now())
  selectedBy  String   // username
}

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value String
}

model User {
  id            String   @id @default(cuid())
  username      String   @unique
  role          String   @default("user") // "admin" | "user"
  overseerrId   Int?     @unique
  createdAt     DateTime @default(now())
}
```

---

## API Design

### Webhook Receiver
```
POST /api/webhook/overseerr
```
Payload from Overseerr:
```json
{
  "notification_type": "MEDIA_APPROVED",
  "media": {
    "media_type": "movie",
    "tmdbId": 12345,
    "status": "APPROVED"
  },
  "request": {
    "id": 42,
    "requestedBy_username": "manan"
  }
}
```
**Flow:**
1. Validate webhook secret
2. Save request to DB with status `pending`
3. Push to BullMQ queue for async Prowlarr search
4. Return `200 OK` immediately (don't block Overseerr)

---

### Search Endpoint
```
GET /api/search?query=Inception&type=movie&tmdbId=27205
```
Response:
```json
{
  "results": [
    {
      "title": "Inception (2010) [1080p] [YTS.MX]",
      "indexer": "YTS",
      "size": 2147483648,
      "seeders": 4521,
      "leechers": 120,
      "infoUrl": "https://...",
      "downloadUrl": "https://...",
      "magnetUrl": "magnet:?xt=..."
    }
  ],
  "total": 47,
  "query": "Inception",
  "searchedAt": "2026-02-21T10:00:00Z"
}
```

---

### Download Endpoint
```
POST /api/download
```
```json
{
  "requestId": "clxxx123",
  "torrentIndex": 2,
  "downloadUrl": "https://...",
  "savePath": "/downloads/movies"
}
```
**Flow:**
1. Send torrent to qBittorrent via Web API
2. Get back torrent hash
3. Save selected torrent to DB
4. Update request status to `downloading`
5. Notify Radarr/Sonarr that download is in progress

---

## Key Integrations

### Prowlarr
```typescript
// services/prowlarr.ts
const searchProwlarr = async (query: string, type: 'movie' | 'tv') => {
  const res = await fetch(`${PROWLARR_URL}/api/v1/search?query=${query}&type=${type}`, {
    headers: { 'X-Api-Key': PROWLARR_API_KEY }
  });
  return res.json(); // Returns standardized results across all indexers
};
```

### qBittorrent
```typescript
// services/qbittorrent.ts
const addTorrent = async (downloadUrl: string, savePath: string) => {
  const form = new FormData();
  form.append('urls', downloadUrl);
  form.append('savepath', savePath);
  form.append('category', 'pickrr');

  await fetch(`${QBIT_URL}/api/v2/torrents/add`, {
    method: 'POST',
    headers: { Cookie: await getQbitCookie() },
    body: form
  });
};
```

### Overseerr Webhook Setup
In Overseerr → Settings → Notifications → Webhook:
```
URL: http://pickrr:3000/api/webhook/overseerr
Secret: your_webhook_secret
Events: MEDIA_APPROVED, MEDIA_AUTO_APPROVED
```

---

## UI Screens

### 1. Pending Requests Dashboard
```
┌────────────────────────────────────────────────────────┐
│  🎬 Pickrr          Pending (3)   History   Settings   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────┐  Inception (2010)                        │
│  │  [poster]│  Requested by: manan · 2 mins ago        │
│  │          │  47 results found                        │
│  └──────────┘  [ Select Torrent ▼ ]                   │
│                                                        │
│  ┌──────────┐  The Bear S03 (2024)                     │
│  │  [poster]│  Requested by: user2 · 5 mins ago        │
│  │          │  23 results found                        │
│  └──────────┘  [ Select Torrent ▼ ]                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 2. Torrent Selection Modal
```
┌────────────────────────────────────────────────────────┐
│  Inception (2010) — Select Torrent              [✕]    │
├────────────────────────────────────────────────────────┤
│  Sort by: [Seeders ▼]   Filter: [All Indexers ▼]      │
├──────┬───────────────────────────┬──────┬──────┬───────┤
│ IDX  │ Title                     │ Size │Seeds │ Leech │
├──────┼───────────────────────────┼──────┼──────┼───────┤
│ YTS  │ Inception.2010.1080p.YTS  │ 2.1G │ 4521 │  120  │ ← [↓ Grab]
│ 1337x│ Inception.2010.2160p.FLUX │ 8.9G │ 892  │   34  │ ← [↓ Grab]
│ TPB  │ Inception.2010.BluRay.x265│ 4.2G │ 1203 │   89  │ ← [↓ Grab]
│ YTS  │ Inception.2010.720p.YTS   │ 900M │ 8921 │  340  │ ← [↓ Grab]
└──────┴───────────────────────────┴──────┴──────┴───────┘
│  Showing 10 of 47 results                    [Load More]│
└────────────────────────────────────────────────────────┘
```

### 3. Download Progress
```
┌────────────────────────────────────────────────────────┐
│  Downloading                                           │
│                                                        │
│  Inception (2010)                                      │
│  Inception.2010.1080p.YTS.mp4                         │
│  ████████████████░░░░░░  72%   1.5 GB / 2.1 GB        │
│  ↓ 8.4 MB/s  · ETA 2 mins · Seeds: 4521               │
└────────────────────────────────────────────────────────┘
```

---

## Docker Compose

```yaml
services:
  pickrr:
    image: ghcr.io/yourusername/pickrr:latest
    container_name: pickrr
    restart: unless-stopped
    expose:
      - "3000"
    volumes:
      - /opt/pickrr/data:/app/data      # SQLite DB
    env_file:
      - .env
    depends_on:
      - redis
    networks:
      - dokploy-network

  redis:
    image: redis:7-alpine
    container_name: pickrr-redis
    restart: unless-stopped
    volumes:
      - /opt/pickrr/redis:/data
    networks:
      - dokploy-network

networks:
  dokploy-network:
    external: true
```

---

## Environment Variables

```env
# App
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=https://pickrr.yourdomain.com
WEBHOOK_SECRET=your_overseerr_webhook_secret

# Prowlarr
PROWLARR_URL=http://prowlarr:9696
PROWLARR_API_KEY=your_prowlarr_api_key

# qBittorrent
QBIT_URL=http://qbittorrent:8080
QBIT_USERNAME=admin
QBIT_PASSWORD=your_qbit_password

# Radarr
RADARR_URL=http://radarr:7878
RADARR_API_KEY=your_radarr_api_key

# Sonarr
SONARR_URL=http://sonarr:8989
SONARR_API_KEY=your_sonarr_api_key

# Overseerr
OVERSEERR_URL=http://overseerr:5055
OVERSEERR_API_KEY=your_overseerr_api_key

# TMDB (free API key at themoviedb.org)
TMDB_API_KEY=your_tmdb_api_key

# Redis
REDIS_URL=redis://pickrr-redis:6379

# Paths
MOVIES_SAVE_PATH=/downloads/movies
TV_SAVE_PATH=/downloads/tv
```

---

## Phased Development Plan

### Phase 1 — MVP (3-4 days)
- [ ] Next.js project setup with Tailwind + shadcn/ui
- [ ] Prisma + SQLite schema
- [ ] Overseerr webhook receiver
- [ ] Prowlarr search service
- [ ] qBittorrent send service
- [ ] Basic pending requests UI
- [ ] Torrent selection modal
- [ ] Docker Compose setup

### Phase 2 — Polish (3-4 days)
- [ ] TMDB metadata integration (posters, ratings, overview)
- [ ] Download progress tracking (poll qBit API)
- [ ] Radarr/Sonarr import notification after download
- [ ] Download history page
- [ ] Basic auth (username/password)
- [ ] Settings page (configure all API connections via UI)

### Phase 3 — Advanced (ongoing)
- [ ] Overseerr SSO / OAuth login
- [ ] Per-user role permissions (admin selects vs users can select)
- [ ] Custom scoring/ranking rules (prefer specific indexers)
- [ ] Auto-select fallback after X hours if no one picks
- [ ] Discord/Telegram notifications
- [ ] Mobile-responsive PWA
- [ ] GitHub Actions CI/CD + GHCR image publishing

---

## Open Source Setup

```
GitHub: github.com/yourusername/pickrr
License: MIT
```

**README badges to add:**
- Docker pulls
- GitHub stars
- License
- Self-hostable

**Community:**
- Post on r/selfhosted, r/radarr, r/sonarr after MVP
- Submit to awesome-selfhosted list
- Discord server for support

---

## Potential Name Ideas
- **Pickrr** — pick your torrent
- **Graborr** — grab + arr
- **Selectarr** — obvious
- **Torrenteer** — sounds cool
- **Choosarr** — choose + arr

---

*Built to fill the gap in the arr ecosystem. PRs welcome.*
