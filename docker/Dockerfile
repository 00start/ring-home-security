# Ring Home Security - Multi-stage Docker Build
# Builds the SvelteKit app and worker processes

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build SvelteKit app
RUN npm run build

# Build workers
RUN npm run build:workers

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install ffmpeg for video transcoding
RUN apk add --no-cache ffmpeg

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Copy built assets
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/dist ./dist
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./
COPY --from=builder --chown=sveltekit:nodejs /app/ecosystem.config.cjs ./

# Install production dependencies only
COPY --from=deps /app/node_modules ./node_modules

# Create directories for data
RUN mkdir -p /app/data/recordings /app/logs && \
    chown -R sveltekit:nodejs /app/data /app/logs

# Switch to non-root user
USER sveltekit

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Default command runs the web server
# Use docker-compose to run all services
CMD ["node", "build/index.js"]
