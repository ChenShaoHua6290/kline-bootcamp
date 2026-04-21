#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker 未安装，请先安装 Docker Desktop 或 Docker Engine"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERROR] docker compose 不可用，请升级 Docker 版本"
  exit 1
fi

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

echo "[1/5] 启动 PostgreSQL + Redis..."
docker compose up -d postgres redis

echo "[2/5] 安装依赖..."
npm install --legacy-peer-deps

echo "[3/5] 生成 Prisma Client..."
npm run prisma:generate -w @kline/api

echo "[4/5] 执行数据库迁移(开发模式)..."
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
