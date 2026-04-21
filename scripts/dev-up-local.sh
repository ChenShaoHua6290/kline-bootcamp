#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm 未安装，请先安装 Node.js (建议 20+)"
  exit 1
fi

ENV_FILE="apps/api/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOT'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kline"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret"
EOT
  echo "[INFO] 已自动创建 $ENV_FILE"
fi

check_port() {
  local host="$1"
  local port="$2"
  (echo >"/dev/tcp/$host/$port") >/dev/null 2>&1
}

echo "[1/5] 检查本地 PostgreSQL(5432) ..."
if check_port 127.0.0.1 5432; then
  echo "[OK] PostgreSQL 端口可访问"
else
  echo "[ERROR] 无法连接 PostgreSQL (127.0.0.1:5432)，请先在本机安装并启动 PostgreSQL"
  exit 1
fi

echo "[2/5] 检查本地 Redis(6379) ..."
if check_port 127.0.0.1 6379; then
  echo "[OK] Redis 端口可访问"
else
  echo "[WARN] Redis 未运行（127.0.0.1:6379）。MVP 可降级运行，但建议启动 Redis。"
fi

echo "[3/5] 安装依赖..."
npm install

echo "[4/5] 生成 Prisma Client + 执行迁移..."
npm run prisma:generate -w @kline/api
npx prisma migrate dev --name init --schema apps/api/prisma/schema.prisma

echo "[5/5] 启动前后端开发服务..."
echo "[INFO] API: http://localhost:4000"
echo "[INFO] WEB: http://localhost:3000"

cleanup() {
  echo "\n[INFO] 正在停止开发进程..."
  kill 0 >/dev/null 2>&1 || true
}
trap cleanup INT TERM EXIT

npm run dev:api &
npm run dev:web &

wait
