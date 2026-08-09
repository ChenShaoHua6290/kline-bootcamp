#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

log() {
  echo "[preflight $(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
  echo "[preflight][ERROR] $*" >&2
  exit 1
}

command -v npm >/dev/null 2>&1 || fail "npm 未安装"
command -v docker >/dev/null 2>&1 || fail "docker 未安装"
docker compose version >/dev/null 2>&1 || fail "docker compose 不可用"

[ -f "$COMPOSE_FILE" ] || fail "$COMPOSE_FILE 不存在"
[ -f "$ENV_FILE" ] || fail "$ENV_FILE 不存在，请先 cp .env.production.example .env.production 并填写"

log "1/7 锁文件一致性检查 (root npm ci)"
npm ci --legacy-peer-deps

log "2/7 API 依赖完整性检查"
npm --prefix apps/api ci --legacy-peer-deps

log "3/7 Web 依赖完整性检查"
npm --prefix apps/web ci --legacy-peer-deps

log "4/7 API 生产编译"
npm --prefix apps/api run build

log "5/7 Web 生产编译"
npm --prefix apps/web run build

log "6/7 docker compose 配置校验"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

log "7/7 生产镜像构建校验"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build

log "Preflight 通过：可执行生产部署。"
