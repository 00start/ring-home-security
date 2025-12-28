-- Enable WAL mode for better performance and crash resistance
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('doorbell', 'camera', 'sensor', 'misc')),
    subtype TEXT,
    location TEXT,
    battery_level INTEGER,
    is_online INTEGER NOT NULL DEFAULT 1,
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    faulted INTEGER,
    tamper_status TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Events table (without recording_id foreign key initially)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('motion', 'ding', 'door_open', 'door_close', 'device_offline', 'device_online')),
    timestamp TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    recording_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- Recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    duration REAL NOT NULL DEFAULT 0,
    file_size INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    quality TEXT CHECK (quality IS NULL OR quality IN ('high', 'medium', 'low')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Device retention configuration table (STOR-004)
CREATE TABLE IF NOT EXISTS device_retention_config (
    device_id TEXT PRIMARY KEY,
    retention_days INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'normal', 'low')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ring tokens table for persistent storage
CREATE TABLE IF NOT EXISTS ring_tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    refresh_token TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_device_timestamp ON events(device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_recordings_device_id ON recordings(device_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_quality ON recordings(quality);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_retention_config_device_id ON device_retention_config(device_id);
