#!/bin/sh
echo "Running Prisma db push..."
npx prisma db push --skip-generate 2>&1 || echo "Warning: Prisma db push failed, continuing..."
echo "Running one-time re-seed for LeaseSimple rebrand..."
npx tsx prisma/clear-and-reseed.ts 2>&1 || echo "Warning: Re-seed failed, continuing..."
echo "Starting Next.js..."
npm run start
