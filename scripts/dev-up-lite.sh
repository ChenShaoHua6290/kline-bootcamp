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
JWT_REFRESH_SECRET="dev-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
APP_URL="http://localhost:3000"
SMTP_HOST="smtp.exmail.qq.com"
SMTP_PORT="465"
SMTP_USER="zhizuoyizhongmoshi@1mode.cn"
SMTP_PASS="4buDKESR8KiiuuBj"
SMTP_FROM="zhizuoyizhongmoshi@1mode.cn"
EOT
  echo "[INFO] 已创建 $ENV_FILE (Lite 模式)"
fi

# Ensure SQLITE_URL exists (for schema.sqlite.prisma)
if ! grep -q '^SQLITE_URL=' "$ENV_FILE"; then
  echo 'SQLITE_URL="file:./dev.db"' >> "$ENV_FILE"
fi

# Load lite env vars for prisma commands in this shell.
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [ "${SQLITE_URL:-}" = "file:./dev.db" ]; then
  export SQLITE_URL="file:${ROOT_DIR}/apps/api/prisma/dev.db"
fi

if [ "${DATABASE_URL:-}" = "file:./dev.db" ]; then
  export DATABASE_URL="$SQLITE_URL"
fi

echo "[1/4] 安装依赖..."
npm install --legacy-peer-deps

echo "[2/4] 使用 SQLite schema 生成 Prisma Client..."
npx prisma generate --schema apps/api/prisma/schema.sqlite.prisma

echo "[3/4] 使用 SQLite push 数据结构..."
if ! npx prisma db push --schema apps/api/prisma/schema.sqlite.prisma; then
  echo "[WARN] Prisma db push 失败，回退到 sqlite3 初始化表结构..."
  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "[ERROR] 未找到 sqlite3，无法完成 Lite 数据库初始化。"
    exit 1
  fi
  SQLITE_DB_PATH="${SQLITE_URL#file:}"
  mkdir -p "$(dirname "$SQLITE_DB_PATH")"
  sqlite3 "$SQLITE_DB_PATH" < scripts/sqlite-init.sql
  echo "[INFO] 已使用 sqlite3 初始化: $SQLITE_DB_PATH"
fi

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
