#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PRISMA_VERSION="${PRISMA_VERSION:-5.22.0}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-30}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
  echo "[ERROR] $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 未安装"
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

choose_scope() {
  cat <<'EOF'
选择更新范围：
1) 全量（api + web + nginx）
2) 仅 API
3) 仅 Web + Nginx
4) 仅 Nginx
5) 仅迁移数据库（不重建服务）
6) 仅查看服务状态
7) 仅查看日志
EOF
  read -rp "请输入选项 [1-7]: " scope
  echo "$scope"
}

run_migrate() {
  log "执行 Prisma migrate deploy (prisma@$PRISMA_VERSION)..."
  compose run --rm api npx -y "prisma@$PRISMA_VERSION" migrate deploy --schema apps/api/prisma/schema.prisma
}

build_and_up() {
  local services="$1"
  local no_cache="$2"
  local build_args=()
  if [[ "$no_cache" == "y" || "$no_cache" == "Y" ]]; then
    build_args+=(--no-cache)
  fi

  if [[ -z "$services" ]]; then
    log "构建全部服务镜像..."
    compose build "${build_args[@]}"
    log "启动全部服务..."
    compose up -d
  else
    log "构建服务: $services"
    # shellcheck disable=SC2086
    compose build "${build_args[@]}" $services
    log "启动服务: $services"
    # shellcheck disable=SC2086
    compose up -d $services
  fi
}

show_logs() {
  cat <<'EOF'
选择日志服务：
1) api
2) web
3) nginx
4) postgres
5) redis
EOF
  read -rp "请输入选项 [1-5]: " log_scope
  case "$log_scope" in
    1) compose logs -f api ;;
    2) compose logs -f web ;;
    3) compose logs -f nginx ;;
    4) compose logs -f postgres ;;
    5) compose logs -f redis ;;
    *) fail "无效日志选项" ;;
  esac
}

print_rollback_hint() {
  cat <<'EOF'

[回滚建议]
1) 查看最近提交：
   git log --oneline -n 5
2) 回退到上一个版本（示例）：
   git reset --hard HEAD~1
3) 重新构建并启动：
   docker compose --env-file .env.production -f docker-compose.prod.yml build api web nginx
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d api web nginx

注意：回滚前请确认当前代码是否已提交，避免误丢本地修改。
EOF
}

health_check_service() {
  local service="$1"
  local timeout="$2"
  local elapsed=0
  while (( elapsed < timeout )); do
    local cid
    cid="$(compose ps -q "$service" 2>/dev/null || true)"
    if [[ -z "$cid" ]]; then
      sleep 1
      ((elapsed+=1))
      continue
    fi
    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || true)"
    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      return 0
    fi
    if [[ "$status" == "unhealthy" || "$status" == "exited" || "$status" == "dead" ]]; then
      return 1
    fi
    sleep 1
    ((elapsed+=1))
  done
  return 1
}

post_deploy_health_check() {
  local services="$1"
  local timeout="$2"
  local targets=()
  if [[ -z "$services" ]]; then
    targets=(api web nginx)
  else
    for s in $services; do
      case "$s" in
        api|web|nginx|postgres|redis) targets+=("$s") ;;
      esac
    done
  fi
  if [[ ${#targets[@]} -eq 0 ]]; then
    return 0
  fi

  log "开始健康检查（超时 ${timeout}s）：${targets[*]}"
  local failed=()
  for s in "${targets[@]}"; do
    if health_check_service "$s" "$timeout"; then
      log "健康检查通过: $s"
    else
      failed+=("$s")
      log "健康检查失败: $s"
    fi
  done

  if [[ ${#failed[@]} -gt 0 ]]; then
    echo "[ERROR] 以下服务健康检查失败: ${failed[*]}"
    echo "[INFO] 建议先查看日志："
    for s in "${failed[@]}"; do
      echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs --tail=120 $s"
    done
    print_rollback_hint
    return 1
  fi
  return 0
}

main() {
  need_cmd docker
  docker compose version >/dev/null 2>&1 || fail "docker compose 不可用"
  need_cmd git

  [[ -f "$ENV_FILE" ]] || fail "$ENV_FILE 不存在，请先创建"
  [[ -f "$COMPOSE_FILE" ]] || fail "$COMPOSE_FILE 不存在"

  scope="$(choose_scope)"

  if [[ "$scope" != "6" && "$scope" != "7" ]]; then
    read -rp "是否先执行 git pull --ff-only? [Y/n]: " do_pull
    if [[ "${do_pull:-Y}" =~ ^[Yy]$ ]]; then
      log "拉取最新代码..."
      git pull --ff-only || fail "git pull 失败"
    fi
  fi

  case "$scope" in
    1)
      read -rp "是否先执行数据库迁移? [Y/n]: " do_migrate
      read -rp "是否使用 --no-cache 构建? [y/N]: " no_cache
      if [[ "${do_migrate:-Y}" =~ ^[Yy]$ ]]; then run_migrate; fi
      build_and_up "" "${no_cache:-N}"
      ;;
    2)
      read -rp "是否先执行数据库迁移? [Y/n]: " do_migrate
      read -rp "是否使用 --no-cache 构建? [y/N]: " no_cache
      if [[ "${do_migrate:-Y}" =~ ^[Yy]$ ]]; then run_migrate; fi
      build_and_up "api" "${no_cache:-N}"
      ;;
    3)
      read -rp "是否使用 --no-cache 构建? [y/N]: " no_cache
      build_and_up "web nginx" "${no_cache:-N}"
      ;;
    4)
      read -rp "是否使用 --no-cache 构建? [y/N]: " no_cache
      build_and_up "nginx" "${no_cache:-N}"
      ;;
    5)
      run_migrate
      ;;
    6)
      compose ps
      ;;
    7)
      show_logs
      ;;
    *)
      fail "无效选项"
      ;;
  esac

  if [[ "$scope" != "7" ]]; then
    log "当前服务状态："
    compose ps
  fi

  if [[ "$scope" == "1" || "$scope" == "2" || "$scope" == "3" || "$scope" == "4" ]]; then
    local services_for_check=""
    case "$scope" in
      1) services_for_check="api web nginx" ;;
      2) services_for_check="api" ;;
      3) services_for_check="web nginx" ;;
      4) services_for_check="nginx" ;;
    esac
    if ! post_deploy_health_check "$services_for_check" "$HEALTH_TIMEOUT"; then
      exit 1
    fi
  fi
}

main "$@"
