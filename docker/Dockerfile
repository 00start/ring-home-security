# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the SvelteKit app
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install ffmpeg and other runtime dependencies
RUN apk add --no-cache ffmpeg

# Install PM2 globally
RUN npm install -g pm2

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/src ./src
COPY --from=builder /app/ecosystem.config.cjs ./

# Create data directories
RUN mkdir -p data/recordings data/thumbnails

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats || exit 1

# Start all processes with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
