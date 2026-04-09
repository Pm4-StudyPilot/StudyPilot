#!/bin/bash
set -e

echo "Waiting for MinIO to be ready..."
until mc alias set minio http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD 2>/dev/null; do
    sleep 1
done

echo "Setting up CORS rules..."
mc cors apply minio/$MINIO_BUCKET /minio-cors.json

echo "Making bucket public if not already..."
mc anonymous set download minio/$MINIO_BUCKET

echo "MinIO setup complete."
