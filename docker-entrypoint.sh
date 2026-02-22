#!/bin/sh
set -e

echo "Ensuring data directory exists..."
mkdir -p /app/data

echo "Running database migrations..."
prisma migrate deploy

echo "Seeding database (first run only)..."
prisma db seed || true

echo "Starting webhook worker..."
node worker.cjs &
WORKER_PID=$!
echo "Worker started (PID: $WORKER_PID)"

echo "Starting Next.js server..."
exec node server.js
