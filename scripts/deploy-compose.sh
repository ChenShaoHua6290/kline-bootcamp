#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
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
  cat >&2 <<'EOF'
选择更新范围：
1) 全量（api + web + nginx）
   - 适用：后端和前端都有改动；或不确定改动范围时

2) 仅 API
   - 适用：只改了后端接口/服务/权限逻辑/数据库访问

3) 仅 Web + Nginx
   - 适用：只改了前端页面、样式、交互（如弹窗、按钮、文案）

4) 仅 Nginx
   - 适用：只改了 nginx 配置（反向代理、路由、缓存头等）

5) 仅迁移数据库（构建 api 镜像但不重启服务）
   - 适用：只想先执行 Prisma migration；迁移文件会来自最新 api 镜像

6) 仅查看服务状态
   - 适用：快速检查容器是否正常运行

7) 仅查看日志
   - 适用：排查问题（可选 api/web/nginx/postgres/redis）
EOF
  read -rp "请输入选项 [1-7]: " scope >&2
  echo "$scope"
}

scope_desc() {
  case "$1" in
    1) echo "全量发布（api + web + nginx）" ;;
    2) echo "仅 API（后端逻辑）" ;;
    3) echo "仅 Web + Nginx（前端页面/样式）" ;;
    4) echo "仅 Nginx（网关配置）" ;;
    5) echo "仅数据库迁移（构建 api 镜像但不重启服务）" ;;
    6) echo "仅查看服务状态" ;;
    7) echo "仅查看服务日志" ;;
    *) echo "未知选项" ;;
  esac
}

check_prisma_cli() {
  log "校验 api 镜像内置 Prisma CLI 版本..."
  compose run --rm --no-deps api node node_modules/prisma/build/index.js --version
}

run_migrate() {
  check_prisma_cli
  log "执行 Prisma migrate deploy（使用当前 api 镜像内置 Prisma CLI）..."
  compose run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
}

build_services() {
  local services="$1"
  local no_cache="$2"
  local build_args=()
  if [[ "$no_cache" == "y" || "$no_cache" == "Y" ]]; then
    build_args+=(--no-cache)
  fi

  if [[ -z "$services" ]]; then
    log "构建全部服务镜像..."
    compose build "${build_args[@]}"
  else
    log "构建服务: $services"
    # shellcheck disable=SC2086
    compose build "${build_args[@]}" $services
  fi
}

up_services() {
  local services="$1"
  if [[ -z "$services" ]]; then
    log "启动全部服务..."
    compose up -d
  else
    log "启动服务: $services"
    # shellcheck disable=SC2086
    compose up -d $services
  fi
}

build_and_up() {
  local services="$1"
  local no_cache="$2"
  build_services "$services" "$no_cache"
  up_services "$services"
}

ensure_data_services() {
  log "确保 PostgreSQL / Redis 已启动..."
  compose up -d postgres redis
  post_deploy_health_check "postgres redis" "$HEALTH_TIMEOUT"
}

cleanup_docker_garbage() {
  log "开始清理 Docker 部署垃圾（不删除数据卷 volumes）..."
  docker system df || true

  if docker container prune -f; then
    log "已清理停止状态容器。"
  else
    log "[WARN] 清理停止状态容器失败，已跳过。"
  fi

  if docker image prune -f; then
    log "已清理悬空镜像。"
  else
    log "[WARN] 清理悬空镜像失败，已跳过。"
  fi

  if docker builder prune -f; then
    log "已清理未使用的构建缓存。"
  else
    log "[WARN] 清理构建缓存失败，已跳过。"
  fi

  docker system df || true
}

ask_cleanup_after_success() {
  cat <<'EOF'
[选择] 部署健康检查通过，是否清理本次部署产生的 Docker 垃圾?
- Y（默认，推荐）：清理停止容器、悬空镜像、构建缓存；不会删除数据库/上传文件等 volume
- n：保留缓存和旧的悬空镜像，便于下一次构建更快
EOF
  local do_cleanup
  read -rp "请输入 [Y/n]（默认 Y）: " do_cleanup
  if [[ "${do_cleanup:-Y}" =~ ^[Yy]$ ]]; then
    cleanup_docker_garbage
  else
    log "已选择跳过 Docker 垃圾清理。"
  fi
}

show_logs() {
  cat <<'EOF'
选择日志服务：
1) api
   - 适用：接口错误、鉴权、业务逻辑、数据库访问问题
2) web
   - 适用：页面报错、构建产物问题、前端运行异常
3) nginx
   - 适用：反向代理、路由转发、静态资源访问问题
4) postgres
   - 适用：数据库连接、慢查询、迁移问题
5) redis
   - 适用：缓存/队列/限流相关问题
EOF
  read -rp "请输入选项 [1-5]（默认 1: api）: " log_scope
  log_scope="${log_scope:-1}"
  log "你选择了日志查看项: $log_scope"
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
  log "你选择了：$(scope_desc "$scope")"

  do_pull="N"
  do_migrate="N"
  no_cache="N"
  do_health="Y"
  health_ok="N"

  if [[ "$scope" != "6" && "$scope" != "7" ]]; then
    cat <<'EOF'
[选择] 是否先执行 git pull --ff-only?
- Y（默认，推荐）：拉取远端最新代码，避免用旧代码部署
- n：跳过拉代码（仅当你确认本机代码已是目标版本）
EOF
    read -rp "请输入 [Y/n]（默认 Y）: " do_pull
    if [[ "${do_pull:-Y}" =~ ^[Yy]$ ]]; then
      log "拉取最新代码..."
      git pull --ff-only || fail "git pull 失败"
    else
      log "已选择跳过 git pull。"
    fi
  fi

  case "$scope" in
    1)
      cat <<'EOF'
[选择] 是否先执行数据库迁移?
- Y（默认，推荐）：有 schema 变更时先迁移，避免 API 启动后报表结构错误
- n：确认本次无数据库变更时可跳过
EOF
      read -rp "请输入 [Y/n]（默认 Y）: " do_migrate
      cat <<'EOF'
[选择] 是否使用 --no-cache 构建?
- y：彻底重建镜像（最干净，但更慢）
- N（默认）：使用缓存构建（更快，常规推荐）
EOF
      read -rp "请输入 [y/N]（默认 N）: " no_cache
      build_services "" "${no_cache:-N}"
      if [[ "${do_migrate:-Y}" =~ ^[Yy]$ ]]; then
        ensure_data_services
        run_migrate
      else
        log "已选择跳过数据库迁移。"
      fi
      up_services ""
      ;;
    2)
      cat <<'EOF'
[选择] 是否先执行数据库迁移?
- Y（默认，推荐）：后端涉及 Prisma/schema 时建议执行
- n：确认本次后端无数据库结构变更可跳过
EOF
      read -rp "请输入 [Y/n]（默认 Y）: " do_migrate
      cat <<'EOF'
[选择] 是否使用 --no-cache 构建?
- y：彻底重建 api 镜像（更慢）
- N（默认）：使用缓存构建（更快）
EOF
      read -rp "请输入 [y/N]（默认 N）: " no_cache
      build_services "api" "${no_cache:-N}"
      if [[ "${do_migrate:-Y}" =~ ^[Yy]$ ]]; then
        ensure_data_services
        run_migrate
      else
        log "已选择跳过数据库迁移。"
      fi
      up_services "api"
      ;;
    3)
      cat <<'EOF'
[选择] 是否使用 --no-cache 构建?
- y：彻底重建 web/nginx 镜像（更慢）
- N（默认）：使用缓存构建（更快，前端改动常用）
EOF
      read -rp "请输入 [y/N]（默认 N）: " no_cache
      build_and_up "web nginx" "${no_cache:-N}"
      ;;
    4)
      cat <<'EOF'
[选择] 是否使用 --no-cache 构建?
- y：彻底重建 nginx 镜像
- N（默认）：使用缓存构建
EOF
      read -rp "请输入 [y/N]（默认 N）: " no_cache
      build_and_up "nginx" "${no_cache:-N}"
      ;;
    5)
      cat <<'EOF'
[选择] 是否使用 --no-cache 构建 api 迁移镜像?
- y：彻底重建 api 镜像（更慢）
- N（默认）：使用缓存构建（更快）

说明：迁移文件在 api 镜像里，执行迁移前需要先构建 api 镜像；不会重启正在运行的 api 服务。
EOF
      read -rp "请输入 [y/N]（默认 N）: " no_cache
      build_services "api" "${no_cache:-N}"
      ensure_data_services
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

  if [[ "$scope" == "1" || "$scope" == "2" || "$scope" == "3" || "$scope" == "4" ]]; then
    cat <<EOF

[执行摘要]
- 范围：$(scope_desc "$scope")
- git pull：$([[ "${do_pull:-Y}" =~ ^[Yy]$ ]] && echo "是" || echo "否")
- 数据库迁移：$([[ "${do_migrate:-N}" =~ ^[Yy]$ ]] && echo "是" || echo "否")
- 构建模式：$([[ "${no_cache:-N}" =~ ^[Yy]$ ]] && echo "--no-cache（彻底重建）" || echo "默认缓存构建")
EOF
    cat <<'EOF'
[选择] 是否执行发布后健康检查?
- Y（默认，推荐）：检查服务是否健康，失败会给出回滚指引
- n：跳过检查（不推荐）
EOF
    read -rp "请输入 [Y/n]（默认 Y）: " do_health
  fi

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
    if [[ "${do_health:-Y}" =~ ^[Yy]$ ]]; then
      if ! post_deploy_health_check "$services_for_check" "$HEALTH_TIMEOUT"; then
        exit 1
      fi
      health_ok="Y"
    else
      log "已跳过健康检查。"
    fi

    if [[ "$health_ok" == "Y" ]]; then
      ask_cleanup_after_success
    else
      log "未执行健康检查，跳过自动清理；确认服务正常后可手动执行 docker image prune -f 和 docker builder prune -f。"
    fi
  fi
}

main "$@"
