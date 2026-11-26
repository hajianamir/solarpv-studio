# Multi-stage production container for SolarPV Studio
FROM node:22.22.3-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Build production bundle
RUN npm run build

# Production runtime stage
FROM node:22.22.3-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
# Server imports routers, study contracts and capability/reference modules as well
# as the engine. Keep the complete transitive source tree, not an engine-only slice.
COPY --from=builder /app/src ./src
COPY --from=builder /app/services ./services
# Study request/result contracts imported by the server bind to registered
# reference metadata at module load. Keep these files in the final image too.
COPY --from=builder /app/docs/reference-data ./docs/reference-data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "--import", "tsx", "server.ts"]
