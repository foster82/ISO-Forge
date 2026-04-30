#!/bin/sh
set -e

# Ensure storage and data directories exist
mkdir -p /app/storage/base /app/storage/builds /app/data

# Run migrations/schema sync
npx prisma db push --accept-data-loss

# Start the application
exec "$@"
