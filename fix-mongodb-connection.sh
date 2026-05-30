#!/bin/bash

# Fix MongoDB Connection for Gratog Production Deployment

echo "=== Fixing MongoDB Connection for Gratog ==="

# Set the correct MongoDB URI in Vercel
echo "Updating MONGODB_URI environment variable..."
vercel env rm MONGODB_URI production -y 2>/dev/null || true
# Read MONGODB_URI from .env.local instead of hardcoding
MONGODB_URI=$(grep MONGODB_URI .env.local | cut -d '=' -f 2-)
echo "$MONGODB_URI" | vercel env add MONGODB_URI production

echo "Environment variables updated successfully!"

echo "=== Next Steps ==="
echo "1. Redeploy the application to Vercel"
echo "2. Test product pages again"