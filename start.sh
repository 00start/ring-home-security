#!/bin/bash
# Ring Home Security startup script

set -e

VERBOSE=false
ACTION="up -d"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --logs|-l)
            ACTION="logs -f"
            shift
            ;;
        --stop)
            ACTION="down"
            shift
            ;;
        --restart)
            ACTION="restart"
            shift
            ;;
        --pull)
            ACTION="pull"
            shift
            ;;
        --help|-h)
            echo "Ring Home Security"
            echo ""
            echo "Usage: ./start.sh [options]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v    Enable debug logging"
            echo "  --logs, -l       Follow container logs"
            echo "  --stop           Stop all containers"
            echo "  --restart        Restart all containers"
            echo "  --pull           Pull latest images"
            echo "  --help, -h       Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build docker compose command
if [ "$VERBOSE" = true ]; then
    COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.verbose.yml"
    echo "Starting with verbose logging (LOG_LEVEL=debug)..."
else
    COMPOSE_CMD="docker compose"
fi

# Execute
$COMPOSE_CMD $ACTION
