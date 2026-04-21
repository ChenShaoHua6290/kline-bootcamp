# Kline Blind Training MVP

## 一键启动（推荐）

### 前置要求
- Docker（含 `docker compose`）
- Node.js + npm（建议 Node 20+）

### 启动命令
```bash
npm run dev:up
```

该命令会自动执行：
1. 启动 PostgreSQL + Redis（Docker）
2. 自动生成 `apps/api/.env`（若不存在）
3. 安装依赖（脚本内使用 `--legacy-peer-deps` 以规避 npm peer 冲突）
4. 生成 Prisma Client
5. 执行 Prisma 开发迁移
6. 同时启动 API + Web 开发服务

访问地址：
- API: http://localhost:4000
- Web: http://localhost:3000

### 停止基础服务
```bash
npm run dev:down
```

---


## 零依赖一键启动（无 Docker / 无 PostgreSQL / 无 Redis）

如果你本机没有 Docker、PostgreSQL、Redis，可以使用 Lite 模式（SQLite 本地文件）：

```bash
npm run dev:up:lite
```

Lite 模式说明：
- 使用 `apps/api/prisma/schema.sqlite.prisma`
- 本地数据库文件：`apps/api/prisma/dev.db`
- Redis 不强依赖（服务内已做降级）

---

## 无 Docker 一键启动

如果你本机没有 Docker，请先安装并启动：
- PostgreSQL（监听 `127.0.0.1:5432`）
- Redis（监听 `127.0.0.1:6379`，可选但推荐）

然后执行：
```bash
npm run dev:up:local
```

脚本会自动检查本地端口、生成 `.env`（若缺失）、安装依赖、执行 Prisma 并启动前后端。

---

## 手动启动（可选）

1. 安装依赖
```bash
npm install --legacy-peer-deps
```

2. Backend env (`apps/api/.env`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kline"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret"
```

3. Prisma
```bash
npm run prisma:generate -w @kline/api
# then run prisma migrate in your own environment
```

4. Run
```bash
npm run dev:api
npm run dev:web
```
