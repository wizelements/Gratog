#!/bin/bash

# Fix MongoDB Connection for Gratog Production Deployment

echo "=== Fixing MongoDB Connection for Gratog ==="

# Set the correct MongoDB URI in Vercel
echo "Updating MONGODB_URI environment variable..."
vercel env rm MONGODB_URI production -y 2>/dev/null || true
echo 'mongodb+srv://Togratitude:$gratitud3$@gratitude0.1ckskrv.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority&appName=Gratitude0' | vercel env add MONGODB_URI production

echo "Environment variables updated successfully!"

echo "=== Next Steps ==="
echo "1. Redeploy the application to Vercel"
echo "2. Test product pages again"