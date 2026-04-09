# ============================================
# Stage 1: Frontend Builder
# ============================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npx vite build

# ============================================
# Stage 2: Backend Builder (Bun)
# ============================================
FROM oven/bun:1-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package.json backend/bun.lock* ./
COPY backend/prisma ./prisma/
RUN bun install --frozen-lockfile --production

RUN bunx prisma generate

COPY backend/ ./
RUN NODE_ENV=production bun build src/index.ts --outdir dist --target node --external @mapbox/node-pre-gyp --external bcrypt

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install nginx and supervisor for process management
RUN apk add --no-cache nginx supervisor

# Copy frontend build artifacts
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy backend
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/package.json /app/backend/package.json
COPY --from=backend-builder /app/backend/prisma /app/backend/prisma

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Start script
COPY <<'EOF' /start.sh
#!/bin/sh
set -e

echo "Starting backend..."
cd /app/backend
NODE_ENV=production node dist/index.js &
BACKEND_PID=$!

echo "Giving backend 3 seconds to start..."
sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend process died!"
    exit 1
fi
echo "Backend is running."

echo "Starting nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Wait for nginx to start
sleep 2

# If any process dies, kill all
trap "kill $BACKEND_PID $NGINX_PID 2>/dev/null; exit" INT TERM

wait $BACKEND_PID
EOF

RUN chmod +x /start.sh && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /app/backend && \
    mkdir -p /var/lib/nginx/logs && \
    chown -R appuser:appgroup /var/lib/nginx && \
    chown -R appuser:appgroup /run && \
    rm -f /etc/nginx/conf.d/default.conf

USER appuser

EXPOSE 80

ENTRYPOINT ["/start.sh"]
