#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ] && echo "${DATABASE_URL}" | grep -q '^file:'; then
  echo "DATABASE_URL points to SQLite (file:...), but app now uses PostgreSQL. Falling back to bundled postgres."
  DATABASE_URL=""
fi

if [ -z "${DATABASE_URL:-}" ]; then
  POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  POSTGRES_DB="${POSTGRES_DB:-pickrr}"
  POSTGRES_USER="${POSTGRES_USER:-pickrr}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-pickrr}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
  echo "DATABASE_URL not set; using bundled postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
else
  echo "DATABASE_URL is set; using external postgres connection"
fi

echo "Running Prisma migrations..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until su -s /bin/sh nextjs -c 'npx prisma migrate deploy'; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "Prisma migration failed after ${MAX_ATTEMPTS} attempts"
    exit 1
  fi
  echo "Database not ready yet. Retrying in 2s... (${ATTEMPTS}/${MAX_ATTEMPTS})"
  sleep 2
done

echo "Seeding database..."
su -s /bin/sh nextjs -c 'npx prisma db seed'

echo "Starting Next.js server as nextjs..."
exec su -s /bin/sh nextjs -c 'node server.js'
