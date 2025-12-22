# Ring Home Security startup script for Windows

param(
    [switch]$Verbose,
    [switch]$v,
    [switch]$Logs,
    [switch]$l,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Pull,
    [switch]$Help,
    [switch]$h
)

# Handle short flags
if ($v) { $Verbose = $true }
if ($l) { $Logs = $true }
if ($h) { $Help = $true }

if ($Help) {
    Write-Host "Ring Home Security" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\start.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Verbose, -v     Enable debug logging"
    Write-Host "  -Logs, -l        Follow container logs"
    Write-Host "  -Stop            Stop all containers"
    Write-Host "  -Restart         Restart all containers"
    Write-Host "  -Pull            Pull latest images"
    Write-Host "  -Help, -h        Show this help"
    exit 0
}

# Determine action
$Action = "up -d"
if ($Logs) { $Action = "logs -f" }
if ($Stop) { $Action = "down" }
if ($Restart) { $Action = "restart" }
if ($Pull) { $Action = "pull" }

# Build command
if ($Verbose) {
    Write-Host "Starting with verbose logging (LOG_LEVEL=debug)..." -ForegroundColor Yellow
    $ComposeFiles = "-f docker-compose.yml -f docker-compose.verbose.yml"
} else {
    $ComposeFiles = ""
}

# Execute
$Command = "docker compose $ComposeFiles $Action"
Write-Host "Running: $Command" -ForegroundColor DarkGray
Invoke-Expression $Command
