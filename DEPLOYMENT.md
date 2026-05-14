# K线双盲训练系统生产部署文档

本文档基于当前仓库真实结构编写：
- 前端：`apps/web`（Next.js）
- 后端：`apps/api`（NestJS + Prisma）
- 数据库：PostgreSQL（Docker）
- 缓存/队列：Redis（Docker）
- 反向代理：Nginx（Docker）

## 1. 部署目标

目标是让服务器可以：
1. `git pull` 后执行 `bash scripts/deploy.sh` 完成更新。
2. 使用 `docker-compose.prod.yml` 管理完整生产服务。
3. 用 Prisma 生产迁移命令 `migrate deploy` 初始化/升级数据库。

## 2. 服务器要求

推荐：
- Ubuntu 22.04 / 24.04
- 2核2G（可用）或 2核4G（更推荐）
- 已安装 Docker、Docker Compose、Git

首次初始化可执行：
```bash
sudo bash scripts/server-init.sh
```

## 3. 必须提交与禁止提交

### 3.1 必须提交（Git）

- `apps/web/src/**`
- `apps/api/src/**`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/**`
- `scripts/**`
- `config/**`
- `package.json`
- `package-lock.json`
- `tsconfig*`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `docker-compose.prod.yml`
- `nginx/**`
- `DEPLOYMENT.md`
- `.env.production.example`
- `.gitignore`

### 3.2 禁止提交（Git）

- `node_modules/`
- `apps/web/.next/`
- `apps/api/dist/`
- `dist/`
- `build/`
- `data/`
- `*.csv`
- `*.zip`
- `*.sqlite`
- `*.db`
- `.env`
- `.env.local`
- `.env.production`
- `logs/`
- `coverage/`

## 4. 环境变量

复制模板：
```bash
cp .env.production.example .env.production
```

关键变量说明：
- `DATABASE_URL`：API 连接 Postgres
- `REDIS_URL`：API/BullMQ 连接 Redis
- `JWT_SECRET`：必须使用强随机字符串
- `API_PORT`：API 容器端口（默认 `4000`）
- `WEB_PORT`：Web 容器端口（默认 `3000`）
- `NEXT_PUBLIC_API_URL`：前端 API 基地址（建议 `/api`）
- `NEXT_PUBLIC_API_BASE_URL`：兼容变量（建议同样填 `/api`）

强随机密钥示例：
```bash
openssl rand -base64 48
```

## 5. Docker Compose 架构

生产编排文件：`docker-compose.prod.yml`

包含服务：
- `postgres`（volume 持久化）
- `redis`（volume 持久化）
- `api`（NestJS 生产构建）
- `web`（Next.js 生产构建）
- `nginx`（80 端口入口）

安全原则：
- 仅 `nginx` 暴露公网端口。
- `postgres`/`redis` 不暴露到公网。

## 6. Nginx 路由设计

配置文件：`nginx/default.conf`

默认路由：
- `/` -> `web:3000`
- `/api` -> `api:4000`

说明：当前后端 Controller 路由是 `/auth`、`/training` 等，无全局 `/api` 前缀，故 Nginx 已做 rewrite，避免 `/api/api`。

## 7. 首次部署步骤（新服务器）

```bash
# 1) 进入部署目录
cd /opt/kline-bootcamp

# 2) 拉取代码
git clone <你的仓库地址> .

# 3) 准备环境变量
cp .env.production.example .env.production
vim .env.production

# 4) 一键部署
bash scripts/deploy.sh
```

部署脚本会自动执行：
1. `git pull --ff-only`
2. `docker compose build`
3. `docker compose up -d`
4. `prisma migrate deploy`
5. `prisma generate`
6. 输出服务状态

## 8. 后续更新步骤

```bash
git pull
bash scripts/deploy.sh
```

## 9. 数据库初始化与 Prisma 命令

生产只使用：
```bash
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
```

禁止在生产使用：
```bash
prisma migrate dev
```

## 10. 数据导入说明（data/ 不进 Git）

`data/` 是服务器本地数据目录，不提交 Git。

推荐流程：
1. 把 CSV/ZIP 上传到服务器 `data/raw/...`。
2. 或在服务器执行下载脚本。
3. 再执行：
```bash
npm run data:normalize
npm run data:import
npm run data:verify
```
4. 导入完成后，训练实际读取 PostgreSQL 数据。

备注：历史数据文件（CSV/ZIP/SQLite/DB）都不应进入 Git。

## 11. 数据备份与恢复

### 11.1 PostgreSQL 备份

```bash
docker exec kline-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
```

### 11.2 PostgreSQL 恢复

```bash
cat backup_2026-01-01.sql | docker exec -i kline-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### 11.3 Volume 说明

- PostgreSQL 数据在 Docker volume `pgdata`。
- Redis 数据在 Docker volume `redisdata`（AOF 持久化）。

查看卷：
```bash
docker volume ls
docker volume inspect kline-bootcamp_pgdata
```

### 11.4 数据目录备份建议

建议定期备份：
- `data/raw/`
- `data/normalized/`
- PostgreSQL SQL 备份文件

## 12. HTTPS 配置

### 方式A：先用 HTTP 跑通

先使用 `80` 端口确认系统正常访问：
- `http://your-domain.com`
- `http://your-domain.com/api`

### 方式B：Nginx + Certbot

宿主机安装 certbot（Ubuntu）：
```bash
sudo apt-get update
sudo apt-get install -y certbot
```

如果你将 Nginx 放在宿主机，可用：
```bash
sudo certbot --nginx -d your-domain.com
```

如果 Nginx 在 Docker 内，建议：
1. 临时停用容器 Nginx 占用 80。
2. 使用 `certbot certonly --standalone -d your-domain.com`。
3. 将证书挂载到 Nginx 容器，并在 `default.conf` 添加 443 server。

也可使用：
- 腾讯云 SSL 证书
- Cloudflare 代理 HTTPS

## 13. 安全基线

1. `JWT_SECRET` / `JWT_REFRESH_SECRET` 必须为强随机值。
2. `.env.production` 严禁提交 Git。
3. PostgreSQL 不暴露公网端口。
4. Redis 不暴露公网端口。
5. 仅开放 `22/80/443`。
6. 管理员账号：通过数据库手动设置用户 `role=ADMIN`（建议仅限内网运维）。
7. 邀请码注册逻辑不要关闭（系统已实现邀请码模型与兑换记录）。

## 14. 验收清单

- 新服务器 `clone` 后可按本文档完成部署。
- `docker compose up -d` 后 web/api 可访问。
- PostgreSQL 数据持久化有效。
- Redis 可连接。
- `prisma migrate deploy` 可执行。
- `.env.production` 未被 Git 跟踪。
- `data/` 未被 Git 跟踪。
- build 产物不提交。

## 15. 常用运维命令

查看状态：
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

查看日志：
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f nginx
```

重启服务：
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart
```
