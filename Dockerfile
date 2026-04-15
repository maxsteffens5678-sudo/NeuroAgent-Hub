# ============================================
# NeuroAgent Hub - Dockerfile
# Multi-stage build for optimized production image
# ============================================

# ============================================
# STAGE 1: BUILDER
# ============================================

FROM node:18-alpine AS builder

LABEL maintainer="NeuroAgent Hub"
LABEL description="Self-Learning Multi-Agent System for Android"
LABEL version="1.0.0"

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    git

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Run any build steps if needed
RUN npm run build 2>/dev/null || true

# ============================================
# STAGE 2: RUNTIME (Production)
# ============================================

FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Set working directory
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install runtime dependencies only
RUN apk add --no-cache \
    curl \
    dumb-init

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build . .

# Create directories for data persistence
RUN mkdir -p /app/logs /app/data /app/memory && \
    chown -R nodejs:nodejs /app/logs /app/data /app/memory

# Switch to nodejs user (security best practice)
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["node", "server.js"]

# ============================================
# METADATA
# ============================================

LABEL org.opencontainers.image.title="NeuroAgent Hub"
LABEL org.opencontainers.image.description="Self-Learning Multi-Agent System"
LABEL org.opencontainers.image.url="https://github.com/Moxma91/NeuroAgent-Hub"
LABEL org.opencontainers.image.documentation="https://github.com/Moxma91/NeuroAgent-Hub/blob/main/README.md"
