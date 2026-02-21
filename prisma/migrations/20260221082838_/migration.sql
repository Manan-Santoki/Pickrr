-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "overseerrId" INTEGER NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "posterPath" TEXT,
    "overview" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Torrent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "indexer" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "seeders" INTEGER NOT NULL,
    "leechers" INTEGER NOT NULL,
    "infoUrl" TEXT,
    "downloadUrl" TEXT NOT NULL,
    "magnetUrl" TEXT,
    "qbitHash" TEXT,
    "selectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedBy" TEXT NOT NULL,
    CONSTRAINT "Torrent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Request_overseerrId_key" ON "Request"("overseerrId");

-- CreateIndex
CREATE UNIQUE INDEX "Torrent_requestId_key" ON "Torrent"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
