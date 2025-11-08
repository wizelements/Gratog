#!/bin/bash

# Script to flatten the app/app/* structure to app/*
# This fixes the 404 routing issues

set -e

echo "🔍 Flattening app/app/* to app/*..."

# Create backup
echo "📦 Creating backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="/app/backup_app_structure_${timestamp}"
mkdir -p "$backup_dir"
cp -r /app/app "$backup_dir/"

echo "✅ Backup created at: $backup_dir"

# Move all contents from app/app to a temp location
echo "📂 Moving app/app/* to temporary location..."
temp_dir="/tmp/app_flatten_${timestamp}"
mkdir -p "$temp_dir"
mv /app/app/* "$temp_dir/"

# Now move everything from temp back to app/
echo "📂 Moving contents back to app/..."
mv "$temp_dir"/* /app/app/

# Clean up temp directory
rm -rf "$temp_dir"

echo "✅ Structure flattened successfully!"
echo ""
echo "📋 Summary:"
echo "   - Moved app/app/* → app/*"
echo "   - Backup saved at: $backup_dir"
echo ""
echo "🔄 Next steps:"
echo "   1. Clear Next.js cache: rm -rf .next"
echo "   2. Rebuild: npm run build"
echo "   3. Test routes: /order, /checkout, /api/checkout"
