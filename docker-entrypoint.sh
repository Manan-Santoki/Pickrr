#!/bin/sh
set -e

echo "Ensuring data directory exists..."
mkdir -p /app/data
chmod 0777 /app/data || true
chown nextjs:nodejs /app/data || true

echo "Starting webhook worker as nextjs..."
su -s /bin/sh nextjs -c 'node worker.cjs &' || (echo "failed to start worker as nextjs" && exit 1)
echo "Worker started"

echo "Starting Next.js server as nextjs..."
exec su -s /bin/sh nextjs -c 'node server.js'
