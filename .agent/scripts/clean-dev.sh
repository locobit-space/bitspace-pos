#!/bin/bash
# Script to cleanly restart dev server and kill any stale processes

echo "🧹 Cleaning up stale processes..."

# Kill any running nuxt dev processes
pkill -f "nuxt dev" || true

# Kill any stale esbuild processes
pkill -f "esbuild" || true

# Wait a moment for processes to terminate
sleep 2

echo "🗑️  Clearing build caches..."

# Remove build caches
rm -rf .nuxt
rm -rf node_modules/.vite
rm -rf node_modules/.cache

echo "✨ Starting dev server..."

# Start the dev server
yarn dev
