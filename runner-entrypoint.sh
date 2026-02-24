#!/bin/sh
set -e

echo "🚀 Starting FirmOS Runner Container..."

# Ensure workspace directory exists
if [ ! -d "/workspace" ]; then
    echo "Creating /workspace..."
    mkdir -p /workspace
fi

# Fix Git dubious ownership issues for mounted volumes
git config --global --add safe.directory '*'

echo "🔗 Connecting to infrastructure..."
# We can add a wait-for-it here for Postgres/RabbitMQ if needed

# Start the daemon
echo "⚡ Executing daemon..."
exec node /app/dist/src/daemon.js
