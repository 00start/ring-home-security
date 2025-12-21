# Ring Home Security

A self-hosted Node.js/TypeScript application for recording Ring doorbell and camera video feeds, logging sensor events, and providing a web-based dashboard for viewing and searching historical data.

## Features

- **Ring Integration**: Connect to Ring API to monitor doorbells, cameras, and sensors
- **Video Recording**: Automatic recording on motion and doorbell events
- **Event Logging**: Log all sensor events (door/window, motion) with timestamps
- **Web Dashboard**: Responsive web UI for monitoring devices and viewing events
- **Video Playback**: Watch recordings directly in the browser
- **Retention Policy**: Automatic cleanup of old recordings
- **Real-time Updates**: Server-sent events for live updates

## Architecture

This system uses a **single codebase, multiple processes** architecture:

1. **SvelteKit Web Server** - Handles dashboard pages and API endpoints
2. **Ring Listener Worker** - Maintains connection to Ring API, listens for events
3. **Transcode Worker** - Processes video recordings via ffmpeg
4. **Retention Worker** - Cleans up old recordings based on retention policy

## Prerequisites

- Node.js 20 LTS or later
- Redis (for job queue)
- ffmpeg (for video transcoding)
- Ring account with refresh token

## Quick Start Guide

This guide assumes you have all prerequisites installed. Follow these steps to get your Ring Home Security system running:

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start Redis

**Option A: Using Docker (Recommended for Windows)**
```bash
docker compose -f docker/docker-compose.yml up -d redis
```

**Option B: Using Redis Server (Linux/macOS)**
```bash
redis-server
```

Verify Redis is running:
```bash
docker exec ring-security-redis redis-cli ping
# Should return: PONG
```

### Step 3: Initialize the Database

```bash
npm run db:migrate
```

This creates the SQLite database and tables at `./data/ring-security.db` and sets up the default admin user.

### Step 4: Get Your Ring Refresh Token

```bash
npx -p ring-client-api ring-auth-cli
```

Follow the prompts to:
1. Enter your Ring email and password
2. Complete 2FA if enabled
3. Copy the refresh token that's displayed

### Step 5: Configure Environment Variables

Create a `.env` file (or edit the existing one) and add your Ring token:

```env
RING_REFRESH_TOKEN=your_refresh_token_here
```

All other settings have sensible defaults and are optional.

### Step 6: Start the Application

**Terminal 1 - Web Server:**
```bash
npm run dev
```

**Terminal 2 - Ring Listener (optional, only if you want to connect Ring devices):**
```bash
npm run worker:ring
```

**Terminal 3 - Transcode Worker (optional, only needed for video processing):**
```bash
npm run worker:transcode
```

### Step 7: Access the Dashboard

1. Open your browser to http://localhost:5173 (development) or http://localhost:3000 (production)
2. Log in with the default credentials:
   - Username: `admin`
   - Password: `admin`
3. **Important:** Change your password in Settings!

Your Ring devices should now appear on the dashboard, and events will be logged automatically.

---

## Getting Started (Detailed)

### 1. Clone and Install

```bash
git clone <repository-url>
cd ring-home-security
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Ring API - Get your refresh token from ring-client-api
RING_REFRESH_TOKEN=your_ring_refresh_token_here

# Database
DATABASE_PATH=./data/ring-security.db

# Redis
REDIS_URL=redis://localhost:6379

# Storage paths
RECORDINGS_PATH=./data/recordings
THUMBNAILS_PATH=./data/thumbnails

# Retention (days)
RETENTION_DAYS=30

# Server
PORT=3000

# Authentication
AUTH_SECRET=change_this_to_a_secure_random_string
```

### 3. Get Ring Refresh Token

You'll need to obtain a refresh token from Ring. Use the `ring-client-api` package:

```bash
npx -p ring-client-api ring-auth-cli
```

Follow the prompts to authenticate with your Ring account. Copy the refresh token to your `.env` file.

### 4. Initialize Database

```bash
npm run db:migrate
```

### 5. Start Development Server

```bash
# Start Redis (if not running)
redis-server

# Start the web server
npm run dev

# In separate terminals, start the workers:
npm run worker:ring
npm run worker:transcode
```

Visit http://localhost:3000 and log in with:
- Username: `admin`
- Password: `admin`

**Important**: Change the default password after first login!

## Production Deployment

### Using PM2

```bash
# Build the application
npm run build

# Start all processes with PM2
npm run start:pm2

# Or manually:
pm2 start ecosystem.config.cjs
```

### Using Docker

```bash
cd docker
docker-compose up -d
```

## Project Structure

```
/src
  /lib
    /components     # Svelte UI components
    /config         # Configuration management
    /db             # Database client and repositories
    /queue          # BullMQ job queue
    /ring           # Ring API wrapper
    /server         # Server-side utilities
    /stores         # Svelte stores for state management
    /types          # TypeScript interfaces
    /utils          # Common utilities
  /routes
    /api            # API endpoints
    /(app)          # Dashboard pages
    /login          # Login page
  /workers
    ring-listener.ts      # Ring event listener
    transcode-worker.ts   # Video transcoding worker
    retention-worker.ts   # Cleanup worker
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/logout` | POST | End session |
| `/api/auth/me` | GET | Get current user |
| `/api/devices` | GET | List all devices |
| `/api/devices/:id` | GET | Get device details |
| `/api/events` | GET | List events (with filters) |
| `/api/events/:id` | GET | Get event details |
| `/api/events/stream` | GET | SSE stream for real-time events |
| `/api/recordings` | GET | List recordings |
| `/api/recordings/:id` | GET | Get recording details |
| `/api/recordings/:id/video` | GET | Stream video file |
| `/api/recordings/:id/thumbnail` | GET | Get thumbnail image |
| `/api/stats` | GET | Dashboard statistics |

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `RING_REFRESH_TOKEN` | Ring API refresh token | Required |
| `DATABASE_PATH` | SQLite database path | `./data/ring-security.db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `RECORDINGS_PATH` | Video storage path | `./data/recordings` |
| `THUMBNAILS_PATH` | Thumbnail storage path | `./data/thumbnails` |
| `RETENTION_DAYS` | Days to keep recordings | `30` |
| `PORT` | Web server port | `3000` |
| `HOST` | Web server host | `0.0.0.0` |
| `AUTH_SECRET` | Session encryption key | Required |
| `LOG_LEVEL` | Logging level | `info` |
| `FFMPEG_PATH` | Custom ffmpeg path | System ffmpeg |

## Development

```bash
# Run type checking
npm run check

# Format code
npm run format

# Lint code
npm run lint
```

## Troubleshooting

### Ring Connection Issues

1. Verify your refresh token is valid
2. Check if Ring API is accessible
3. Review logs: `pm2 logs ring-listener`

### Video Not Recording

1. Ensure ffmpeg is installed: `ffmpeg -version`
2. Check transcode worker logs: `pm2 logs transcode-worker`
3. Verify Redis is running: `redis-cli ping`

### Database Issues

1. Ensure data directory exists
2. Check file permissions
3. Re-run migrations: `npm run db:migrate`

## License

MIT
