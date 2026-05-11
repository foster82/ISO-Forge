#!/bin/sh
set -e

# Ensure storage and data directories exist
mkdir -p /app/storage/base /app/storage/builds /app/data

# Run migrations/schema sync
npx prisma db push --accept-data-loss

# Run seed to ensure admin user and default settings
npx prisma db seed

# Start the application
exec "$@"
