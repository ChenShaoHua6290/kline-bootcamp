#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production.local"
COMPOSE_FILE="docker-compose.prod.yml"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down

