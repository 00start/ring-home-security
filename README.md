# Ring Home Security

A self-hosted Node.js/TypeScript application for recording Ring doorbell and camera video feeds, logging sensor events, and providing a web-based dashboard for viewing and searching historical data.

## Quick Start with Docker (Recommended)

The easiest way to get started is with Docker:

```bash
# 1. Create a directory and download the config files
mkdir ring-security && cd ring-security
curl -O https://raw.githubusercontent.com/stef-the/ring-home-security/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/stef-the/ring-home-security/main/.env.example
mv .env.example .env

# 2. Get your Ring refresh token
npx -p ring-client-api ring-auth-cli

# 3. Edit .env with your token and generate a secure AUTH_SECRET
# RING_REFRESH_TOKEN=your_token_here
# AUTH_SECRET=$(openssl rand -hex 32)

# 4. Start the application
docker compose up -d
```

Then open http://localhost:3000 and log in with `admin` / `admin` (change this immediately in Settings).

**Requirements:** Docker and Docker Compose

### Docker Commands

```bash
# Start normally
docker compose up -d

# Start with verbose/debug logging
docker compose -f docker-compose.yml -f docker-compose.verbose.yml up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Update to latest version
docker compose pull && docker compose up -d
```

Or use the helper scripts (if you cloned the repo):

```bash
# Linux/macOS
./start.sh              # Start normally
./start.sh --verbose    # Start with debug logging
./start.sh --logs       # Follow logs
./start.sh --stop       # Stop containers

# Windows PowerShell
.\start.ps1             # Start normally
.\start.ps1 -Verbose    # Start with debug logging
.\start.ps1 -Logs       # Follow logs
.\start.ps1 -Stop       # Stop containers
```

## Features

- **Ring Integration**: Connect to Ring API to monitor doorbells, cameras, and sensors
- **Live View**: Watch real-time video streams from your cameras and doorbells
- **Video Recording**: Automatic recording on motion and doorbell events (no Ring Protect subscription required)
- **Pre-Event Recording**: Captures ~15 seconds before events occur using continuous video buffering
- **Event Logging**: Log all sensor events (door/window, motion) with timestamps
- **Web Dashboard**: Responsive web UI for monitoring devices and viewing events
- **Video Playback**: Watch recordings directly in the browser with mpegts.js
- **Advanced Filtering**: Filter events by device, type, date range, and video availability
- **Retention Policy**: Automatic cleanup of old recordings
- **Real-time Updates**: Server-sent events for live updates
- **Comprehensive Logging**: Separate log files for each process with console and file output

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

## Alternative: Clone and Build

If you want to modify the code or run without Docker:

```bash
# Clone the repository
git clone https://github.com/stef-the/ring-home-security.git
cd ring-home-security

# Copy and configure environment
cp .env.example .env
# Edit .env with your RING_REFRESH_TOKEN and AUTH_SECRET
```

### Manual Setup Guide

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
| `/api/devices/:id/live` | GET | Stream live video from camera/doorbell |
| `/api/stats` | GET | Dashboard statistics |

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `RING_REFRESH_TOKEN` | Ring API refresh token | Required |
| `DATABASE_PATH` | SQLite database path | `./data/ring-security.db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `RECORDINGS_PATH` | Video storage path | `./data/recordings` |
| `THUMBNAILS_PATH` | Thumbnail storage path | `./data/thumbnails` |
| `LOGS_PATH` | Log files directory | `./data/logs` |
| `RETENTION_DAYS` | Days to keep recordings | `30` |
| `PORT` | Web server port | `3000` |
| `HOST` | Web server host | `0.0.0.0` |
| `AUTH_SECRET` | Session encryption key | Required |
| `LOG_LEVEL` | Logging level (trace, debug, info, warn, error, fatal) | `info` |
| `FFMPEG_PATH` | Custom ffmpeg path | System ffmpeg |
| `FFPROBE_PATH` | Custom ffprobe path | System ffprobe |
| `BUFFER_PRE_EVENT_SECONDS` | Seconds of video to capture before an event | `15` |
| `BUFFER_LATENCY_COMPENSATION_SECONDS` | Extra buffer for Ring notification delay | `10` |
| `BUFFER_SAFETY_MARGIN_SECONDS` | Additional safety buffer | `5` |
| `BUFFER_POST_EVENT_SECONDS` | Seconds to record after an event | `60` |

## Pre-Event Video Buffering

The Ring Listener maintains a continuous video buffer for each camera, allowing recordings to include footage from **before** an event occurs. This is crucial for capturing the moments leading up to motion or doorbell events.

### How It Works

1. **Continuous Streaming**: The Ring Listener keeps a persistent connection to each camera, streaming video into a circular memory buffer
2. **Buffer Size**: By default, 30 seconds of video are kept in memory per camera (15s pre-event + 10s latency compensation + 5s safety margin)
3. **Event Capture**: When an event is detected, the buffered video is combined with a new 60-second recording
4. **Final Output**: The result is a single video file containing both pre-event and post-event footage

### Resource Usage

| Cameras | Memory Usage | CPU Impact |
|---------|--------------|------------|
| 1       | ~15-30 MB    | Low        |
| 4       | ~60-120 MB   | Medium     |
| 8       | ~120-240 MB  | Medium-High|

The system uses:
- **H.264 baseline profile** with ultrafast encoding preset
- **Memory-based buffering** (no disk I/O during buffering)
- **Staggered startup** (2-second delay between cameras to reduce initial load)
- **Auto-reconnect** with exponential backoff if streams disconnect

### Customizing Buffer Settings

Edit your `.env` file to adjust buffer timing:

```env
# Capture 20 seconds before events instead of 15
BUFFER_PRE_EVENT_SECONDS=20

# Record 90 seconds after events instead of 60
BUFFER_POST_EVENT_SECONDS=90
```

### Fallback Behavior

If the buffer is unavailable (e.g., camera just started, stream disconnected), the system automatically falls back to post-event-only recording, ensuring you never miss an event.

## Live View Streaming

The dashboard supports real-time video streaming from Ring cameras and doorbells using MPEG-TS format with browser-based playback via mpegts.js.

### Technical Details

- **Format**: MPEG-TS container with H.264 baseline video and AAC audio
- **Encoding**: Real-time transcoding with `libx264 ultrafast` preset for low latency
- **Playback**: Uses mpegts.js library for browser-based Media Source Extensions (MSE) playback
- **Latency**: Optimized for low latency with `zerolatency` tuning and live buffer chasing

### Accessing Live View

1. Navigate to the Dashboard or Devices page
2. Click the "Live" button on any camera or doorbell card
3. A modal will open with the live video stream
4. Click outside the modal or press Escape to close

### Browser Compatibility

Live view requires a browser that supports Media Source Extensions (MSE):
- Chrome/Edge (recommended)
- Firefox
- Safari 11+

## Logging

The application maintains separate log files for each process, making it easy to debug issues and monitor activity.

### Log Files Location

By default, logs are stored in `./data/logs/`:

- `web.log` - SvelteKit web server logs (HTTP requests, API calls, errors)
- `ring-listener.log` - Ring API connection, device discovery, event notifications
- `transcode-worker.log` - Video transcoding, thumbnail generation, metadata extraction
- `retention-worker.log` - Cleanup operations, storage management

### Log Format

Each log entry includes:
- **Timestamp**: ISO 8601 format with timezone
- **Level**: trace, debug, info, warn, error, or fatal
- **Component**: The specific module or function generating the log
- **Message**: Human-readable description
- **Context**: Structured data (device IDs, file paths, error details, etc.)

### Viewing Logs

**In Terminal (Real-time)**:
All processes output colored logs to the console for easy monitoring during development.

**Log Files (Persistent)**:
```bash
# View latest logs from a specific process
tail -f ./data/logs/ring-listener.log

# View last 100 lines
tail -n 100 ./data/logs/web.log

# Search for errors
grep ERROR ./data/logs/*.log

# View logs from specific date
grep "2025-12-21" ./data/logs/web.log
```

**In the Dashboard** (coming soon):
Log files will be accessible through the Settings page and Timeline page for easy viewing without terminal access.

### Adjusting Log Level

Set the `LOG_LEVEL` environment variable to control verbosity:

```env
LOG_LEVEL=debug  # For detailed troubleshooting
LOG_LEVEL=info   # Normal operation (default)
LOG_LEVEL=warn   # Only warnings and errors
LOG_LEVEL=error  # Only errors
```

Changes require restarting all processes to take effect.

## Development

```bash
# Run type checking
npm run check

# Format code
npm run format

# Lint code
npm run lint
```

## Processes and Restart Guide

The application consists of multiple independent processes. Here's when you need to restart each one:

| Process | Restart Needed When... | How to Restart |
|---------|------------------------|----------------|
| **Web Server** | - Code changes to routes, components, or API<br>- Environment variable changes<br>- Logging configuration changes | Stop with `Ctrl+C`, then `npm run dev` |
| **Ring Listener** | - Ring refresh token updated<br>- Logging configuration changes<br>- Ring API connection issues | Stop with `Ctrl+C`, then `npm run worker:ring` |
| **Transcode Worker** | - FFmpeg path changes<br>- Logging configuration changes<br>- Video processing issues | Stop with `Ctrl+C`, then `npm run worker:transcode` |
| **Retention Worker** | - Retention days configuration changes<br>- Logging configuration changes | Stop with `Ctrl+C`, then `npm run worker:retention` |

**Note**: After updating the logging configuration in this release, you must restart ALL processes for log file separation to take effect.

## Troubleshooting

### Ring Connection Issues

1. Verify your refresh token is valid
2. Check if Ring API is accessible
3. Review logs:
   ```bash
   tail -f ./data/logs/ring-listener.log
   # or with PM2:
   pm2 logs ring-listener
   ```

### Live View Not Working

1. Ensure ffmpeg is installed and in PATH: `ffmpeg -version`
2. Check web server logs for errors:
   ```bash
   tail -f ./data/logs/web.log
   ```
3. Verify camera is online in the dashboard
4. Check browser console for playback errors

### Video Not Recording

1. Ensure ffmpeg is installed: `ffmpeg -version`
2. Check transcode worker logs:
   ```bash
   tail -f ./data/logs/transcode-worker.log
   # or with PM2:
   pm2 logs transcode-worker
   ```
3. Verify Redis is running: `redis-cli ping`
4. Check Ring listener logs for recording start events

### Database Issues

1. Ensure data directory exists
2. Check file permissions on `./data/ring-security.db`
3. Re-run migrations: `npm run db:migrate`
4. Check web server logs for database errors

### High Storage Usage

1. Check current storage in dashboard Stats card
2. Adjust retention policy: Set `RETENTION_DAYS` in `.env`
3. Manually run retention worker:
   ```bash
   npm run worker:retention
   ```
4. Check retention worker logs:
   ```bash
   tail -f ./data/logs/retention-worker.log
   ```

## License

MIT
