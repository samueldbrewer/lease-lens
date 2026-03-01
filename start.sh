#!/bin/sh
echo "Running Prisma db push..."
npx prisma db push --skip-generate 2>&1 || echo "Warning: Prisma db push failed, continuing..."

# One-time: re-seed with real PDFs (remove after first deploy)
echo "Clearing old seed data and re-seeding with real PDFs..."
npx tsx prisma/clear-and-reseed.ts 2>&1 || echo "Warning: Seed failed, continuing..."

echo "Starting Next.js..."
npm run start
