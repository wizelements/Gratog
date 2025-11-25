#!/bin/bash

# TASTE OF GRATITUDE - VERCEL DEPLOYMENT SCRIPT
# This script deploys the application to Vercel

set -e  # Exit on error

echo "🚀 Deploying Taste of Gratitude to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check for required environment variables
echo "📋 Checking environment variables..."
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found. Using .env.production.template..."
    if [ ! -f ".env.production.template" ]; then
        echo "❌ Error: No environment file found!"
        echo "Please create .env.production from .env.production.template"
        exit 1
    fi
fi

echo "✅ Environment files found"
echo ""

# Build the application locally first to catch any errors
echo "🔨 Building application..."
yarn build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo "This will deploy to production. Press Ctrl+C to cancel."
echo ""
sleep 3

vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your Vercel dashboard to see the deployment"
echo "2. Add your custom domain in Vercel settings"
echo "3. Verify all environment variables are set correctly"
echo "4. Test the live site thoroughly"
echo ""
echo "🎉 Happy selling!"
