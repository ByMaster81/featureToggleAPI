#!/bin/sh


echo "Waiting for database to be ready..."

echo "Running database migrations..."
npx prisma migrate deploy

echo "Migrations complete. Starting the application..."


exec "$@"