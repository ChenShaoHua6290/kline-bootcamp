# K 线训练网站从零开始生产环境部署文档（Ubuntu + Docker）

> 适用项目：`kline-bootcamp`（当前分支：`codex/develop-k-line-simulation-training-system`，当前 commit：`1555e518`）  
> 目标读者：不熟悉服务器的新手  
> 部署目标：在全新 Ubuntu 服务器上，使用 Docker 部署前后端 + PostgreSQL + Redis，并导入你本地已有历史 K 线数据

---

# 0. 项目结构与部署前检查

本章是基于你当前仓库真实文件梳理，不做凭空假设。

## 0.1 项目结构树（真实）

```text
kline-bootcamp/
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── schema.sqlite.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── src/
│   └── web/
│       ├── Dockerfile
│       ├── package.json
│       ├── .env.example
│       └── src/
├── config/
├── data/
├── docs/
├── nginx/
│   └── default.conf
├── scripts/
│   ├── deploy.sh
│   ├── server-init.sh
│   ├── dev-up.sh
│   ├── dev-up-local.sh
│   ├── dev-up-lite.sh
│   ├── dev-down.sh
│   └── data/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.production.example
├── package.json
├── package-lock.json
└── DEPLOYMENT.md
```

## 0.2 你要求检查的文件存在性

- 前端目录：存在，`apps/web`
- 后端/API 目录：存在，`apps/api`（后端 API）
- 配置文件目录：存在，`config/`
- Dockerfile：存在
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
- docker-compose 文件：存在
  - `docker-compose.yml`（主要是本地 Postgres/Redis）
  - `docker-compose.prod.yml`（生产完整栈）
- 包管理锁文件：
  - `package-lock.json`：存在
  - `pnpm-lock.yaml`：不存在
  - `yarn.lock`：不存在
- 数据库 schema / migrations：存在
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/*`
- scripts 脚本目录：存在，`scripts/`
- seed / import 数据脚本：存在
  - `apps/api/prisma/seed.ts`
  - `scripts/data/*.ts`
  - `apps/api/src/scripts/*.ts`
- nginx 配置：存在，`nginx/default.conf`
- `.dockerignore`：不存在（根目录、api、web 都没有）
- `apps/api/.env.example`：不存在

## 0.3 技术栈判断（真实）

- 前端：Next.js 15 + React 19（`apps/web/package.json`）
- 后端：NestJS 10（`apps/api/package.json`）
- ORM：Prisma（`@prisma/client` + `prisma`）
- 数据库：PostgreSQL（生产 schema 为 `schema.prisma`）
- 缓存/队列：Redis + BullMQ（数据导入任务队列）
- 包管理器：npm（根目录为 `package-lock.json`）
- 结构：前后端分离（web 和 api 两个服务）

## 0.4 启动方式与构建方式（真实命令）

- 根构建：
  - `npm run build`
- API 构建：
  - `npm --prefix apps/api run build`
- Web 构建：
  - `npm --prefix apps/web run build`
- 开发启动：
  - `npm run dev:up`（脚本自动起 Postgres/Redis + API + Web）
- 生产部署脚本：
  - `bash scripts/deploy.sh`

## 0.5 Docker 服务组成（真实）

`docker-compose.prod.yml` 包含：

- `postgres`（postgres:16-alpine）
- `redis`（redis:7-alpine）
- `api`（基于 `apps/api/Dockerfile` 构建）
- `web`（基于 `apps/web/Dockerfile` 构建）
- `nginx`（nginx:1.27-alpine，反向代理 web+api）

说明：你项目并不是单一 app，而是 `api + web + nginx`。

## 0.6 数据库、Redis 依赖与后台任务

- PostgreSQL：必需
- Redis：建议必需（导入队列与部分缓存逻辑用到）
- 后台任务：
  - `DataImportProcessor`（BullMQ Worker）在 API 进程内启动
  - 不需要单独再起一个 worker 容器（当前代码结构下）
- 定时任务（cron）：未发现必须的独立 cron 任务
- WebSocket：Nginx 已配置 Upgrade 头，当前代码未发现强依赖单独 ws 服务

## 0.7 数据库关键点（真实）

- Prisma schema：`apps/api/prisma/schema.prisma`
- 迁移目录：`apps/api/prisma/migrations/`
- 生产迁移命令：
  - `npm --prefix apps/api run prisma:migrate:deploy:pg`
- 常见 K 线表（按 market 分）：
  - `bars_crypto`
  - `bars_stock`
  - `bars_forex`
  - `bars_futures`
  - `bars_gold`
- 还有早期/通用表：`MarketBar`
- 索引：迁移里已创建（含 symbolId/timeframe/timestamp 组合索引）

## 0.8 环境变量总表（来自 `.env.production.example` + 代码 + compose）

| 变量名 | 是否必填 | 示例值 | 作用 | 生产注意事项 |
|---|---|---|---|---|
| NODE_ENV | 必填 | production | 运行环境 | 固定 `production` |
| API_PORT | 必填 | 4000 | API 监听端口 | 与 compose/nginx 一致 |
| WEB_PORT | 必填 | 3000 | Web 监听端口 | 与 compose/nginx 一致 |
| NEXT_PUBLIC_API_URL | 必填 | /api | 前端请求 API 地址 | 生产建议 `/api`（同域反代） |
| NEXT_PUBLIC_API_BASE_URL | 建议填 | /api | 前端构建参数 | 与 `NEXT_PUBLIC_API_URL` 保持一致 |
| POSTGRES_USER | 必填 | postgres | PG 用户名 | 改成强密码用户也可 |
| POSTGRES_PASSWORD | 必填 | `<你的数据库密码>` | PG 密码 | 必须高强度 |
| POSTGRES_DB | 必填 | kline | PG 数据库名 | 与 `DATABASE_URL` 一致 |
| DATABASE_URL | 必填 | postgresql://...@postgres:5432/kline?schema=public | Prisma/API 数据库连接 | Docker 内 host 必须写 `postgres`，不要写 `localhost` |
| REDIS_URL | 必填 | redis://redis:6379 | Redis 连接 | Docker 内 host 必须写 `redis` |
| JWT_SECRET | 必填 | 随机长串 | Access Token 签名 | 生产必须替换默认值 |
| JWT_REFRESH_SECRET | 必填 | 随机长串 | Refresh Token 签名 | 生产必须替换默认值 |
| JWT_ACCESS_EXPIRES_IN | 建议填 | 15m | access token 过期 | 与业务安全策略一致 |
| JWT_REFRESH_EXPIRES_IN | 建议填 | 7d | refresh token 过期 | 与业务安全策略一致 |
| NEXT_PUBLIC_CONTACT_WECHAT_ID | 可选 | Return_Objects | 前端展示管理员微信 | 可按实际改 |
| NEXT_PUBLIC_CONTACT_WECHAT_QR | 可选 | /images/wechat-qr.png | 前端展示二维码 | 可使用站内路径或 https 链接 |
| NEXT_PUBLIC_ADMIN_WECHAT_ID | 可选 | Return_Objects | 前端展示管理员微信 | 可按实际改 |
| NEXT_PUBLIC_ADMIN_WECHAT_QR | 可选 | /images/wechat-qr.png | 前端展示二维码 | 可使用站内路径或 https 链接 |
| ADMIN_EMAIL | 可选 | admin@example.com | seed 管理员账号 | 仅执行 seed 时需要 |
| ADMIN_PASSWORD | 可选 | 强密码 | seed 管理员密码 | 仅执行 seed 时需要 |
| SQLITE_URL | 非生产必填 | file:... | 仅 Lite 模式（SQLite） | 生产不用 |
| OFFLINE_CSV_PATH | 可选 | /path/a.csv | 离线导入脚本使用 | 非部署必填 |
| AGGREGATE_MARKETS | 可选 | STOCK | 聚合脚本参数 | 非部署必填 |
| AGGREGATE_SYMBOLS | 可选 | 000001.SZ | 聚合脚本参数 | 非部署必填 |
| SQLITE_BATCH_SIZE | 可选 | 200 | sqlite 迁移脚本参数 | 非部署必填 |
| SQLITE_MIGRATE_PATH | 可选 | /path/old.db | sqlite 迁移脚本参数 | 非部署必填 |

你提到的变量中，当前项目**未发现使用**：

- `APP_PORT`：不存在（项目使用 `API_PORT` 与 `WEB_PORT`）
- `NEXTAUTH_SECRET`：不存在（项目不是 NextAuth）
- `NEXTAUTH_URL`：不存在
- `API_SECRET`：不存在

## 0.9 需要迁移 / 备份 / 持久化的内容

必须持久化：

- PostgreSQL 数据目录（Docker volume：`pgdata`）
- Redis 数据目录（Docker volume：`redisdata`）
- 数据库备份目录（建议宿主机：`/opt/kline-training/backups`）

建议保留：

- `.env.production`
- Nginx 配置
- 部署脚本

## 0.10 部署风险检查（真实发现）

- 存在 `localhost` 写死风险：
  - `apps/web/src/lib/api.ts` 默认回退 `http://localhost:4000`
  - 若生产没配 `NEXT_PUBLIC_API_URL`，前端会请求本机 localhost，导致失败
- 存在硬编码本地数据库连接串（仅脚本）：
  - `scripts/data/_check-stock-timeframes.js` 等脚本里写了 `postgresql://kline_user:123456@localhost:5432/kline`
  - 这些脚本不要直接在生产照抄使用
- `docker-compose.prod.yml` 的 `restart` 当前是 `unless-stopped`，不是 `always`
- `.dockerignore` 不存在，构建上下文偏大
- `apps/api/.env.example` 不存在，新手可能不知 API 环境变量
- 数据库导入/恢复顺序需要注意：
  - 你是“本地库已有完整历史数据复制到生产”，应优先 restore，再做 `migrate deploy`（详见第 9 章）

---

# 1. 服务器初始化

## 1.1 SSH 登录服务器

作用：进入你的 Ubuntu 服务器，开始部署。  
执行位置：本地电脑。

```bash
ssh root@<你的服务器IP>
```

成功标志：看到服务器命令行提示符。  
常见失败：
- `Connection timed out`：安全组/防火墙未开放 22
- `Permission denied`：密码或密钥不对

## 1.2 更新系统并安装基础工具

作用：安装部署必需工具。  
执行位置：服务器。

```bash
apt update && apt -y upgrade
apt install -y ca-certificates curl gnupg lsb-release git ufw vim unzip
```

成功标志：命令无报错返回。  
常见失败：
- DNS 问题导致 `apt` 拉取失败
- 磁盘空间不足

## 1.3 创建部署目录

作用：统一存放项目代码、备份、日志。  
执行位置：服务器。

```bash
mkdir -p /opt/kline-training
mkdir -p /opt/kline-training/backups
mkdir -p /opt/kline-training/logs
```

## 1.4 配置防火墙

作用：只开放必要端口。  
执行位置：服务器。

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

成功标志：状态为 `active`，且看到 22/80/443 规则。  
常见失败：云厂商安全组没同步开放。

## 1.5 可选：创建非 root 用户

执行位置：服务器。

```bash
adduser deploy
usermod -aG sudo deploy
```

可选把 Docker 权限也给 deploy（第 2 章后再执行）。

## 1.6 可选：配置 SSH Key 登录

执行位置：本地电脑 + 服务器。

本地生成密钥（若没有）：

```bash
ssh-keygen -t ed25519 -C "kline-deploy"
```

拷贝公钥到服务器：

```bash
ssh-copy-id root@<你的服务器IP>
```

## 1.7 检查时间、时区、磁盘、内存

执行位置：服务器。

```bash
date
timedatectl

# 推荐改为 UTC（或你团队统一时区）
timedatectl set-timezone UTC

# 磁盘
lsblk
df -h

# 内存
free -h
```

---

# 2. 安装 Docker 和 Docker Compose

> 你的仓库已有 `scripts/server-init.sh`，也可手动安装。这里给完整手动版。

## 2.1 安装 Docker 官方源与组件

执行位置：服务器。

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list >/dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 2.2 验证 Docker

执行位置：服务器。

```bash
docker --version
docker compose version
systemctl status docker --no-pager
```

成功标志：能看到版本号，docker service 为 `active (running)`。

## 2.3 普通用户加入 docker 组（可选）

执行位置：服务器。

```bash
usermod -aG docker deploy
```

重新登录后验证：

```bash
su - deploy
docker ps
```

## 2.4 设置 Docker 开机自启

执行位置：服务器。

```bash
systemctl enable docker
systemctl restart docker
```

---

# 3. 准备项目代码

## 3.1 方式 A：git clone（推荐）

作用：直接拉取仓库，后续方便更新。  
执行位置：服务器。

```bash
cd /opt/kline-training
git clone <你的项目仓库地址> .
```

成功标志：目录下出现 `apps/`、`docker-compose.prod.yml` 等文件。

## 3.2 方式 B：手动上传代码

执行位置：本地电脑。

```bash
rsync -avz --progress ./ root@<你的服务器IP>:/opt/kline-training/
```

## 3.3 检查关键文件完整性

执行位置：服务器。

```bash
cd /opt/kline-training
ls -la

# 核对关键文件
ls -la package.json package-lock.json docker-compose.prod.yml .env.production.example
ls -la apps/api/Dockerfile apps/web/Dockerfile
ls -la apps/api/prisma/schema.prisma apps/api/prisma/migrations
ls -la nginx/default.conf scripts/deploy.sh
```

## 3.4 检查分支和 commit

执行位置：服务器。

```bash
git branch --show-current
git rev-parse --short HEAD
git status
```

---

# 4. 生产环境配置

## 4.1 创建 `.env.production`

作用：生产环境核心配置文件。  
执行位置：服务器（项目根目录）。

```bash
cd /opt/kline-training
cp .env.production.example .env.production
```

编辑：

```bash
vim .env.production
```

## 4.2 推荐生产配置模板（按你项目真实变量）

> 注意：以下值请按你的真实信息替换。

```env
NODE_ENV=production
API_PORT=4000
WEB_PORT=3000

NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_API_BASE_URL=/api

POSTGRES_USER=<数据库用户名>
POSTGRES_PASSWORD=<你的数据库密码>
POSTGRES_DB=<数据库名>
DATABASE_URL=postgresql://<数据库用户名>:<你的数据库密码>@postgres:5432/<数据库名>?schema=public

REDIS_URL=redis://redis:6379

JWT_SECRET=<随机长密钥1>
JWT_REFRESH_SECRET=<随机长密钥2>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

NEXT_PUBLIC_CONTACT_WECHAT_ID=Return_Objects
NEXT_PUBLIC_CONTACT_WECHAT_QR=/images/wechat-qr.png
NEXT_PUBLIC_ADMIN_WECHAT_ID=Return_Objects
NEXT_PUBLIC_ADMIN_WECHAT_QR=/images/wechat-qr.png
```

## 4.3 生成随机密钥

执行位置：服务器。

```bash
openssl rand -hex 32
openssl rand -hex 32
```

把两个结果分别填入 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`。

## 4.4 重要注意事项

- `.env.production` 不能提交 Git
- Docker 内连接数据库主机必须写 `postgres`，不能写 `localhost`
- Docker 内连接 Redis 主机必须写 `redis`，不能写 `localhost`
- 本项目没有 `NEXTAUTH_SECRET/NEXTAUTH_URL`，不需要配置

---

# 5. Docker Compose 生产配置

你项目已经有 `docker-compose.prod.yml`，建议直接使用，不要重复造新文件。  
你提到文件名希望 `docker-compose.production.yml`，可以二选一：

- 方案 A（推荐）：继续使用现有 `docker-compose.prod.yml`
- 方案 B：复制一份别名文件

```bash
cp docker-compose.prod.yml docker-compose.production.yml
```

## 5.1 当前生产 compose 的真实服务

- `postgres`
- `redis`
- `api`
- `web`
- `nginx`

## 5.2 关于“app 暴露 3000”

你的架构里实际是：

- `web` 内部 3000（Next.js）
- `api` 内部 4000（Nest）
- 对公网暴露的是 `nginx:80`（后续加 HTTPS 443）

因此不建议直接公网暴露 Postgres/Redis/API。

## 5.3 建议优化（可选）

- 把 `restart: unless-stopped` 改为 `restart: always`
- 增加日志轮转配置（`logging`）
- 增加 `.dockerignore`，减少构建体积

## 5.4 启动前检查 compose

执行位置：服务器。

```bash
cd /opt/kline-training
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

成功标志：输出合并后的配置且无报错。

---

# 6. 本地数据库导出

目标：把本地 PostgreSQL 的完整业务数据（含历史 K 线）导出成 dump。

## 6.1 查看本地 PostgreSQL 容器名（Docker 场景）

执行位置：本地电脑。

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

找到你的容器名，记为 `<本地postgres容器名>`。

## 6.2 使用 `pg_dump -Fc` 导出（推荐 custom 格式）

### 方案 A：在容器内导出

执行位置：本地电脑。

```bash
docker exec -t kline-postgres pg_dump \
  -U kline_user \
  -d kline \
  -Fc \
  -f /tmp/kline_prod.dump
```

把文件复制到本地：

```bash
docker cp kline-postgres:/tmp/kline_prod.dump ./kline_prod.dump
```

### 方案 B：本机 PostgreSQL（非 Docker）

执行位置：本地电脑。

```bash
PGPASSWORD=<你的数据库密码> pg_dump \
  -h 127.0.0.1 \
  -p 5432 \
  -U <数据库用户名> \
  -d <数据库名> \
  -Fc \
  -f ./kline_prod.dump
```

## 6.3 检查 dump 文件

执行位置：本地电脑。

```bash
ls -lh ./kline_prod.dump
file ./kline_prod.dump
```

成功标志：文件存在且大小合理（通常不会是几 KB）。

## 6.4 常见错误

- `pg_dump: permission denied`：用户权限不足
- `database does not exist`：数据库名错误
- 导出文件极小：可能导出了空库

---

# 7. 上传数据库备份到生产服务器

## 7.1 使用 scp 上传

执行位置：本地电脑。

```bash
scp ./kline_prod.dump root@<你的服务器IP>:/opt/kline-training/backups/
```

## 7.2 使用 rsync 上传（大文件更稳）

执行位置：本地电脑。

```bash
rsync -avzP ./kline_prod.dump ubuntu@:/opt/kline-training/backups/
```

## 7.3 服务器检查文件

执行位置：服务器。

```bash
ls -lh /opt/kline-training/backups/
```

中断重传：继续使用 `rsync -P` 即可断点续传。

---

# 8. 生产数据库初始化

## 8.1 先仅启动 Postgres 与 Redis

执行位置：服务器。

```bash
cd /opt/kline-training
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
```

## 8.2 检查容器状态

执行位置：服务器。

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## 8.3 如需重建数据库（谨慎）

执行位置：服务器。

进入 PostgreSQL：

```bash
docker exec -it kline-postgres psql -U postgres -d postgres
```

删除并重建：

```sql
DROP DATABASE IF EXISTS kline;
CREATE DATABASE kline;
\q
```

## 8.4 导入 dump

执行位置：服务器。

```bash
docker exec -i kline-postgres pg_restore \
  -U postgres \
  -d please_change_me \
  --clean --if-exists --no-owner --no-privileges \
  < /opt/kline-training/backups/kline_prod.dump
```

成功标志：命令结束，无致命 ERROR。

## 8.5 导入后验证

执行位置：服务器。

```bash
docker exec -it <生产postgres容器名> psql -U <数据库用户名> -d <数据库名>
```

```sql
\dt

SELECT COUNT(*) FROM "bars_crypto";
SELECT COUNT(*) FROM "bars_stock";
SELECT COUNT(*) FROM "bars_forex";
SELECT COUNT(*) FROM "bars_futures";
SELECT COUNT(*) FROM "bars_gold";

-- 若你的项目实际主要使用别的表，请按实际表名改
-- 例如：SELECT COUNT(*) FROM "candles";

SELECT MIN("timestamp"), MAX("timestamp") FROM "bars_crypto";
\q
```

## 8.6 检查索引

执行位置：服务器。

```bash
docker exec -it <生产postgres容器名> psql -U <数据库用户名> -d <数据库名> -c "\di"
```

---

# 9. 数据库迁移 / ORM（Prisma）

本项目使用 Prisma，且有 migrations，所以**需要执行迁移**。  
推荐顺序（你这种“从本地复制完整库”场景）：

1. 先 restore 本地完整数据
2. 再执行 `prisma migrate deploy`
3. 再执行 `prisma generate`

这样可避免空库先迁移后导入引发的不一致风险。

## 9.1 在 API 容器里执行迁移

执行位置：服务器。

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

## 9.2 生成 Prisma Client

执行位置：服务器。

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api \
  npx prisma generate --schema apps/api/prisma/schema.prisma
```

## 9.3 可选：初始化管理员（seed）

执行位置：服务器。

```bash
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD='<强密码>'

docker compose --env-file .env.production -f docker-compose.prod.yml run --rm \
  -e ADMIN_EMAIL -e ADMIN_PASSWORD \
  api npx ts-node apps/api/prisma/seed.ts
```

---

# 10. 启动应用

## 10.1 构建镜像

执行位置：服务器。

```bash
cd /opt/kline-training
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

## 10.2 启动全部服务

执行位置：服务器。

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## 10.3 查看状态与日志

执行位置：服务器。

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps

docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api

docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web

docker compose --env-file .env.production -f docker-compose.prod.yml logs -f nginx
```

## 10.4 访问测试

- `http://<你的服务器IP>/`
- `http://<你的服务器IP>/api`（应有 API 响应）

## 10.5 启动失败常见原因

- env 配置错误（最常见）
- `DATABASE_URL` 写成 localhost
- `REDIS_URL` 写成 localhost
- 端口冲突
- 数据库表不存在（迁移未执行）
- build 失败（依赖下载失败/网络问题）

---

# 11. Nginx 反向代理

你当前已经在 Docker 里跑了一个 `nginx` 容器（`nginx/default.conf`）。  
如果你希望改成“宿主机 Nginx + 容器 web/api”，可以按本章做。二选一即可。

## 11.1 宿主机安装 Nginx（可选方案）

执行位置：服务器。

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

## 11.2 示例配置（宿主机 Nginx）

执行位置：服务器。

```bash
cat >/etc/nginx/sites-available/kline-training.conf <<'NGINX'
server {
  listen 80;
  server_name <你的域名>;

  client_max_body_size 50m;

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX

ln -sf /etc/nginx/sites-available/kline-training.conf /etc/nginx/sites-enabled/kline-training.conf
nginx -t
systemctl reload nginx
```

> 如果使用你项目内置 `nginx` 容器，这一章可跳过。

## 11.3 502 Bad Gateway 排查

- 先看 `docker compose ... ps`，确认 `web/api` 是否 up
- 看 `nginx` 容器日志
- 看 `api/web` 容器日志
- 检查代理目标端口是否一致

---

# 12. 域名解析

## 12.1 配置 A 记录

在域名控制台设置：

- `@` -> `<你的服务器IP>`
- `www` -> `<你的服务器IP>`（可选）

## 12.2 检查 DNS 是否生效

执行位置：本地电脑。

```bash
ping <你的域名>
nslookup <你的域名>
dig <你的域名> +short
```

DNS 未生效前可先用 `http://<你的服务器IP>/` 测试服务。

---

# 13. HTTPS 证书

## 13.1 安装 certbot（宿主机 Nginx 场景）

执行位置：服务器。

```bash
apt update
apt install -y certbot python3-certbot-nginx
```

## 13.2 申请证书

执行位置：服务器。

```bash
certbot --nginx -d <你的域名> -d www.<你的域名>
```

按提示选择自动跳转 HTTPS。

## 13.3 测试自动续期

执行位置：服务器。

```bash
certbot renew --dry-run
```

## 13.4 失败常见原因

- 域名未解析到当前服务器
- 80 端口未开放
- Nginx 配置语法错误
- 云防火墙拦截

> 如果你使用“容器内 nginx”，证书管理建议改为 Caddy/Traefik 或把 80/443 终止放在宿主机 Nginx。

---

# 14. 正式上线检查清单

逐项确认：

- Docker 服务正常
- `api/postgres/redis/web/nginx` 容器都正常
- 应用日志无持续报错
- 数据库已导入
- K 线数据可查询（`bars_*` 计数 > 0）
- 训练页面可打开
- 开始训练正常
- 切换周期正常
- 下一条功能正常
- Redis 正常
- 域名访问正常
- HTTPS 正常
- 防火墙规则正常
- PostgreSQL/Redis 未暴露公网
- 备份策略已配置

---

# 15. 日常运维命令

全部在服务器执行（项目目录 `/opt/kline-training`）。

```bash
# 查看容器
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# 查看全部日志
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f

# 仅看 API 日志
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api

# 重启 API
docker compose --env-file .env.production -f docker-compose.prod.yml restart api

# 重启全部
docker compose --env-file .env.production -f docker-compose.prod.yml restart

# 停止全部
docker compose --env-file .env.production -f docker-compose.prod.yml down

# 重新部署（拉代码+构建+启动）
bash scripts/deploy.sh

# 手动更新后重建
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 进入 PostgreSQL
docker exec -it <生产postgres容器名> psql -U <数据库用户名> -d <数据库名>

# 进入 Redis
docker exec -it kline-redis redis-cli

# 磁盘
df -h

# 内存
free -h

# 端口占用
ss -lntp

# Nginx 状态（宿主机）
systemctl status nginx --no-pager

# 系统日志（最近 200 行）
journalctl -n 200 --no-pager
```

---

# 16. 数据库备份和恢复

## 16.1 手动备份

执行位置：服务器。

```bash
mkdir -p /opt/kline-training/backups

BACKUP_FILE="/opt/kline-training/backups/kline_$(date +%F_%H%M%S).dump"

docker exec -t <生产postgres容器名> pg_dump \
  -U <数据库用户名> \
  -d <数据库名> \
  -Fc \
  -f /tmp/kline_latest.dump

docker cp <生产postgres容器名>:/tmp/kline_latest.dump "$BACKUP_FILE"
ls -lh "$BACKUP_FILE"
```

## 16.2 定时 crontab 备份（示例：每天凌晨 3 点）

执行位置：服务器。

```bash
crontab -e
```

加入：

```cron
0 3 * * * docker exec -t <生产postgres容器名> pg_dump -U <数据库用户名> -d <数据库名> -Fc -f /tmp/kline_auto.dump && docker cp <生产postgres容器名>:/tmp/kline_auto.dump /opt/kline-training/backups/kline_$(date +\%F_\%H\%M\%S).dump
```

## 16.3 只保留最近 30 天备份（示例）

执行位置：服务器。

```bash
find /opt/kline-training/backups -type f -name "kline_*.dump" -mtime +30 -delete
```

若保留 7 天，把 `30` 改 `7`。

## 16.4 从备份恢复

执行位置：服务器。

恢复前先备份当前库（非常重要）：

```bash
docker exec -t <生产postgres容器名> pg_dump -U <数据库用户名> -d <数据库名> -Fc -f /tmp/before_restore.dump
docker cp <生产postgres容器名>:/tmp/before_restore.dump /opt/kline-training/backups/
```

恢复：

```bash
docker exec -i <生产postgres容器名> pg_restore \
  -U <数据库用户名> \
  -d <数据库名> \
  --clean --if-exists --no-owner --no-privileges \
  < /opt/kline-training/backups/<你的备份文件名>.dump
```

## 16.5 把生产备份下载到本地

执行位置：本地电脑。

```bash
scp root@<你的服务器IP>:/opt/kline-training/backups/<你的备份文件名>.dump ./
```

## 16.6 验证备份可用

执行位置：服务器或本地。

```bash
pg_restore -l ./kline_prod.dump | head
```

若能列出对象清单，说明备份文件结构正常。

---

# 17. 安全建议

- 不开放 PostgreSQL `5432` 到公网
- 不开放 Redis `6379` 到公网
- 使用高强度数据库密码
- `.env.production` 不提交 Git
- 服务器只开放 22/80/443
- 定期备份数据库
- 定期 `apt update && apt upgrade`
- 不要误删 Docker volume
- 建议禁用 root 密码登录，使用 SSH key
- dump 文件不要放在公网可访问目录
- Nginx 禁止暴露敏感文件（如 `.env`、`.git`）

---

# 18. 常见问题排查

## 18.1 页面打不开

- 检查容器是否运行：`docker compose ... ps`
- 检查 80 端口是否监听：`ss -lntp | grep :80`
- 检查安全组/防火墙

## 18.2 502 Bad Gateway

- `nginx` 在，`web/api` 没起来
- `api` 或 `web` 启动报错
- Nginx 代理地址与容器端口不一致

## 18.3 app 容器启动失败

- 看日志：`docker compose ... logs -f api` 或 `web`
- 重点检查 env 是否缺失

## 18.4 数据库连接失败

- `DATABASE_URL` 是否写了 `@postgres:5432`
- PG 容器是否 healthy
- 用户名/密码/库名是否一致

## 18.5 Redis 连接失败

- `REDIS_URL` 是否为 `redis://redis:6379`
- Redis 容器是否 healthy

## 18.6 导入 dump 失败

- 版本差异（本地 PG 与生产 PG 版本差太多）
- 权限不足
- dump 文件损坏/未完整上传

## 18.7 页面有了但没有 K 线

- 检查 `bars_*` 表是否有数据
- 检查 `Symbol` 表及 symbol 关联
- 检查时间范围是否覆盖当前训练选择

## 18.8 登录失败

- `JWT_SECRET/JWT_REFRESH_SECRET` 变更后老 token 失效是正常现象
- 数据库用户表是否存在，必要时重新 seed 管理员

## 18.9 HTTPS 证书失败

- 域名未生效
- 80 端口未开放
- Nginx 配置错误

## 18.10 Nginx 配置失败

- `nginx -t` 先做语法检查
- 看错误日志定位行号

## 18.11 Docker 权限不足

- 当前用户未加入 docker 组
- 重新登录会话后再试

## 18.12 磁盘满了

- `df -h` 检查
- 清理无用镜像：`docker image prune -a`
- 清理旧备份

## 18.13 端口被占用

- `ss -lntp | grep ':80\|:443\|:3000\|:4000'`
- 停止冲突服务

## 18.14 修改 `.env` 后没生效

- 需要重建/重启容器：
  - `docker compose ... up -d --build`

## 18.15 修改代码后页面没变化

- 生产模式不会热更新
- 需要重新 `build + up -d`

## 18.16 `pg_restore` 报错

- 常见 `already exists`：可加 `--clean --if-exists`
- 常见 owner/权限错误：加 `--no-owner --no-privileges`

## 18.17 Redis 连接超时

- 服务未启动
- 网络隔离问题
- `REDIS_URL` 配置错误

---

# 19. 推荐部署目录结构（结合你的真实项目）

```text
/opt/kline-training
├── apps/
│   ├── api/
│   └── web/
├── config/
├── data/
├── docs/
├── nginx/
│   └── default.conf
├── scripts/
├── docker-compose.prod.yml
├── docker-compose.yml
├── .env.production
├── .env.production.example
├── package.json
├── package-lock.json
├── backups/
│   └── kline_*.dump
└── logs/
```

---

# 20. 最终交付说明

你现在可以按以下最短路径上线：

1. 服务器初始化（第 1、2 章）
2. 拉代码 + 配 `.env.production`（第 3、4 章）
3. 导出本地库并上传（第 6、7 章）
4. 先起 PG/Redis，restore 数据（第 8 章）
5. 执行 Prisma migrate + generate（第 9 章）
6. 启动全部服务（第 10 章）
7. 配域名和 HTTPS（第 12、13 章）

如果你愿意，我下一步可以再给你一份“只保留必须命令的极简上线清单（10 分钟复用版）”，方便你每次发新版时直接照抄执行。
