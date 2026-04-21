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
# Lite mode: no Postgres / no Redis
DATABASE_URL="file:./dev.db"
SQLITE_URL="file:./dev.db"
JWT_SECRET="dev-secret"
EOT
  echo "[INFO] 已创建 $ENV_FILE (Lite 模式)"
fi

# Ensure SQLITE_URL exists (for schema.sqlite.prisma)
if ! grep -q '^SQLITE_URL=' "$ENV_FILE"; then
  echo 'SQLITE_URL="file:./dev.db"' >> "$ENV_FILE"
fi

echo "[1/4] 安装依赖..."
npm install

echo "[2/4] 使用 SQLite schema 生成 Prisma Client..."
npx prisma generate --schema apps/api/prisma/schema.sqlite.prisma

echo "[3/4] 使用 SQLite push 数据结构..."
npx prisma db push --schema apps/api/prisma/schema.sqlite.prisma

echo "[4/4] 启动前后端开发服务..."
echo "[INFO] API: http://localhost:4000"
echo "[INFO] WEB: http://localhost:3000"

echo "[INFO] 当前为 Lite 模式：无需 Postgres/Redis，数据保存在 apps/api/prisma/dev.db"

cleanup() {
  echo "\n[INFO] 正在停止开发进程..."
  kill 0 >/dev/null 2>&1 || true
}
trap cleanup INT TERM EXIT

npm run dev:api &
npm run dev:web &

wait
