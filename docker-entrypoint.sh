#!/bin/sh
set -e

echo "Ensuring data directory exists..."
mkdir -p /app/data

echo "Running database migrations..."
if [ -x "./node_modules/prisma/build/index.js" ]; then
	node ./node_modules/prisma/build/index.js migrate deploy
	echo "Seeding database (first run only)..."
	node ./node_modules/prisma/build/index.js db seed || true
else
	echo "prisma CLI not found in node_modules; skipping migrations."
fi

echo "Starting webhook worker..."
node worker.cjs &
WORKER_PID=$!
echo "Worker started (PID: $WORKER_PID)"

echo "Starting Next.js server..."
exec node server.js
