#!/bin/sh
set -e

echo "Ensuring data directory exists..."
mkdir -p /app/data
chmod 755 /app/data

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database (first run only)..."
npx prisma db seed || true

echo "Starting webhook worker..."
node worker.cjs &
WORKER_PID=$!
echo "Worker started (PID: $WORKER_PID)"

echo "Starting Next.js server..."
exec node server.js
