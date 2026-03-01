#!/bin/sh
echo "Running Prisma db push..."
npx prisma db push --skip-generate 2>&1 || echo "Warning: Prisma db push failed, continuing..."

echo "Running seed script..."
npx tsx prisma/seed.ts 2>&1 || echo "Warning: Seed script failed, continuing..."

echo "Starting Next.js..."
npm run start
