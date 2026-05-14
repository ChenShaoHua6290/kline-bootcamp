#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
  echo "[ERROR] $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker 未安装"
docker compose version >/dev/null 2>&1 || fail "docker compose 不可用"

[ -f "$COMPOSE_FILE" ] || fail "$COMPOSE_FILE 不存在"
[ -f "$ENV_FILE" ] || fail "$ENV_FILE 不存在，请先 cp .env.production.example .env.production 并填写"

log "拉取最新代码..."
git pull --ff-only || fail "git pull 失败，请先处理本地变更或分支冲突"

log "构建镜像..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build || fail "docker compose build 失败"

log "启动服务..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d || fail "docker compose up 失败"

log "执行 Prisma migrate deploy..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy --schema prisma/schema.prisma || fail "prisma migrate deploy 失败"

log "执行 Prisma generate..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api npx prisma generate --schema prisma/schema.prisma || fail "prisma generate 失败"

log "服务状态:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

log "部署完成。"
log "Web: http://<你的域名或服务器IP>/"
log "API: http://<你的域名或服务器IP>/api"
