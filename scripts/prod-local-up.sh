#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production.local"
COMPOSE_FILE="docker-compose.prod.yml"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

ensure_env_file() {
  if [ -f "$ENV_FILE" ]; then
    return
  fi
  if [ -f ".env.production.example" ]; then
    cp .env.production.example "$ENV_FILE"
    sed -i.bak 's#^APP_URL=.*#APP_URL=http://localhost#' "$ENV_FILE" || true
    sed -i.bak 's#^NEXT_PUBLIC_API_URL=.*#NEXT_PUBLIC_API_URL=http://localhost/api#' "$ENV_FILE" || true
    sed -i.bak 's#^NEXT_PUBLIC_API_BASE_URL=.*#NEXT_PUBLIC_API_BASE_URL=http://localhost/api#' "$ENV_FILE" || true
    rm -f "$ENV_FILE.bak"
    log "已从 .env.production.example 生成 $ENV_FILE，请按本机配置检查数据库/JWT/SMTP 后再运行。"
  else
    echo "[ERROR] 找不到 .env.production.example，请先创建 $ENV_FILE"
    exit 1
  fi
}

command -v docker >/dev/null 2>&1 || { echo "[ERROR] docker 未安装"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "[ERROR] docker compose 不可用"; exit 1; }

ensure_env_file

log "构建生产镜像（本地）..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build

log "启动生产服务栈（本地）..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

log "执行 Prisma migrate deploy（使用 Prisma 5，避免版本漂移）..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm api \
  npx -y prisma@5.22.0 migrate deploy --schema apps/api/prisma/schema.prisma

log "当前服务状态："
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

cat <<'EOF'

本地生产模式已启动：
- 前端入口: http://localhost
- API 入口:  http://localhost/api

常用命令：
- npm run prod:local:logs:api
- npm run prod:local:logs:web
- npm run prod:local:down
EOF

