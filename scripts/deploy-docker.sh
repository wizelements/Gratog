#!/bin/bash

# TASTE OF GRATITUDE - DOCKER DEPLOYMENT SCRIPT
# This script builds and runs the application in Docker

set -e

echo "🐳 Docker Deployment for Taste of Gratitude"
echo ""

APP_NAME="taste-of-gratitude"
IMAGE_TAG="latest"
CONTAINER_PORT=3000
HOST_PORT=3000

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $APP_NAME:$IMAGE_TAG .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

echo ""

# Stop and remove existing container if running
echo "🛑 Stopping existing container (if any)..."
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true

echo ""

# Run new container
echo "🚀 Starting new container..."
docker run -d \
  --name $APP_NAME \
  -p $HOST_PORT:$CONTAINER_PORT \
  --env-file .env.production \
  --restart unless-stopped \
  $APP_NAME:$IMAGE_TAG

if [ $? -eq 0 ]; then
    echo "✅ Container started successfully"
    echo ""
    echo "📋 Container details:"
    docker ps | grep $APP_NAME
    echo ""
    echo "🌐 Application running at: http://localhost:$HOST_PORT"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker logs -f $APP_NAME"
    echo "  Stop: docker stop $APP_NAME"
    echo "  Restart: docker restart $APP_NAME"
    echo "  Remove: docker rm -f $APP_NAME"
else
    echo "❌ Failed to start container"
    exit 1
fi
