FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile --production

# Generate Prisma client
RUN bunx prisma generate

# Production image
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .

EXPOSE 3000
CMD ["bun", "src/index.ts"]
