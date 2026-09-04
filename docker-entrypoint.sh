#!/bin/sh
set -e

echo "[itinera] ensuring database schema..."
npx prisma db push --skip-generate

echo "[itinera] starting server on port ${PORT:-3000}..."
exec "$@"
