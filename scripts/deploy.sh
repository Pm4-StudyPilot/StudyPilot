#!/bin/bash
set -e

REGISTRY="ghcr.io"
IMAGE_NAME="${DEPLOY_IMAGE_NAME:-aneshodza/studypilot}"
IMAGE_TAG="${1:-latest}"
IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Pulling ${IMAGE}..."
docker compose -f docker-compose.prod.yml pull

echo "Stopping old containers..."
docker compose -f docker-compose.prod.yml down

echo "Starting new containers..."
docker compose -f docker-compose.prod.yml up -d

echo "Verifying deployment..."
sleep 10
if curl -sf http://localhost/api/health > /dev/null; then
    echo "Deployment successful!"
else
    echo "Health check failed!"
    exit 1
fi
