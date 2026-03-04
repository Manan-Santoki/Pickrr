CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Setting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

CREATE TABLE "Download" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "tmdbId" INTEGER NOT NULL,
  "mediaType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "year" INTEGER,
  "posterPath" TEXT,
  "torrentTitle" TEXT NOT NULL,
  "indexer" TEXT NOT NULL,
  "size" BIGINT NOT NULL,
  "seeders" INTEGER NOT NULL,
  "downloadUrl" TEXT NOT NULL,
  "magnetUrl" TEXT,
  "qbitHash" TEXT,
  "savePath" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'downloading',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Download_userId_createdAt_idx" ON "Download"("userId", "createdAt");

CREATE TABLE "MediaPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "mediaType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "year" INTEGER,
  "posterPath" TEXT,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "inWatchlist" BOOLEAN NOT NULL DEFAULT false,
  "autoFavoritedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaPreference_userId_tmdbId_mediaType_key"
  ON "MediaPreference"("userId", "tmdbId", "mediaType");
CREATE INDEX "MediaPreference_userId_isFavorite_createdAt_idx"
  ON "MediaPreference"("userId", "isFavorite", "createdAt");
CREATE INDEX "MediaPreference_userId_inWatchlist_createdAt_idx"
  ON "MediaPreference"("userId", "inWatchlist", "createdAt");

ALTER TABLE "Download"
  ADD CONSTRAINT "Download_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaPreference"
  ADD CONSTRAINT "MediaPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
