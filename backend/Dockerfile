# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source (backend + any shared code)
COPY backend/ ./backend/

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Lightweight init system for proper signal handling
RUN apk add --no-cache dumb-init

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy only what we need from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --chown=nodejs:nodejs package.json ./

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/index.js"]
