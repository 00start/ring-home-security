-- Migration: Add storage optimization features
-- Version: 001
-- Features: STOR-001, STOR-002, STOR-003, STOR-004

-- Add quality column to recordings table
-- This tracks the video quality preset used for each recording
ALTER TABLE recordings ADD COLUMN quality TEXT CHECK (quality IS NULL OR quality IN ('high', 'medium', 'low'));

-- Create index for quality column for analytics queries
CREATE INDEX IF NOT EXISTS idx_recordings_quality ON recordings(quality);

-- Create device retention configuration table for per-device retention overrides
CREATE TABLE IF NOT EXISTS device_retention_config (
    device_id TEXT PRIMARY KEY,
    retention_days INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'normal', 'low')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Create index for device retention config
CREATE INDEX IF NOT EXISTS idx_device_retention_config_device_id ON device_retention_config(device_id);

-- Note: Existing thumbnails remain as JPEG. New thumbnails will be generated as WebP.
-- A separate batch job can be run to convert existing JPEG thumbnails to WebP if desired.
