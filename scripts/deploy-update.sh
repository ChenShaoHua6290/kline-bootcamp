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
command -v npm >/dev/null 2>&1 || fail "npm 未安装"

[ -f "$COMPOSE_FILE" ] || fail "$COMPOSE_FILE 不存在"
[ -f "$ENV_FILE" ] || fail "$ENV_FILE 不存在，请先配置"

cat <<'EOF'
选择部署范围：
1) 全量服务（api + web + nginx + 依赖）
2) 仅 API
3) 仅 Web + Nginx
4) 仅 Nginx
EOF
read -rp "请输入选项 [1-4]: " scope

case "$scope" in
  1) SERVICES="" ;;
  2) SERVICES="api" ;;
  3) SERVICES="web nginx" ;;
  4) SERVICES="nginx" ;;
  *) fail "无效选项" ;;
esac

read -rp "是否执行 git pull --ff-only? [Y/n]: " do_pull
if [[ "${do_pull:-Y}" =~ ^[Yy]$ ]]; then
  log "拉取最新代码..."
  git pull --ff-only || fail "git pull 失败"
fi

read -rp "是否执行 preflight 检查? [Y/n]: " do_preflight
if [[ "${do_preflight:-Y}" =~ ^[Yy]$ ]]; then
  log "执行 preflight..."
  npm run preflight:prod || fail "preflight 未通过"
fi

read -rp "是否使用 --no-cache 构建镜像? [y/N]: " no_cache
BUILD_ARGS=""
if [[ "${no_cache:-N}" =~ ^[Yy]$ ]]; then
  BUILD_ARGS="--no-cache"
fi

if [ -z "$SERVICES" ]; then
  log "构建全部服务镜像..."
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build $BUILD_ARGS || fail "build 失败"
  log "启动全部服务..."
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d || fail "up -d 失败"
else
  log "构建服务: $SERVICES"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build $BUILD_ARGS $SERVICES || fail "build 失败"
  log "启动服务: $SERVICES"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d $SERVICES || fail "up -d 失败"
fi

if [[ "$scope" == "1" || "$scope" == "2" ]]; then
  read -rp "是否执行 Prisma migrate deploy? [Y/n]: " do_migrate
  if [[ "${do_migrate:-Y}" =~ ^[Yy]$ ]]; then
    log "执行 Prisma migrate deploy..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm api \
      npx prisma migrate deploy --schema apps/api/prisma/schema.prisma || fail "migrate deploy 失败"
  fi
fi

log "当前服务状态："
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

cat <<'EOF'
可选日志查看：
  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f nginx
EOF
