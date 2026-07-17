# 重装系统后恢复部署手册

本文用于服务器被入侵后的同机重装恢复。原则是：只恢复确认需要的业务数据，不复用旧系统目录、旧镜像、旧 `node_modules`、旧 `.env.production`、旧 SSH key 或旧云 API key。

以下命令以这些值为例，按实际替换：

- 域名：`1mode.cn`、`www.1mode.cn`
- 服务器用户：`ubuntu`
- 部署目录：`/opt/kline-bootcamp`
- 仓库：`https://github.com/ChenShaoHua6290/kline-bootcamp.git`
- 分支：`codex/develop-k-line-simulation-training-system`
- 本地备份目录：`incident-backup`

## 1. 重装前确认

在本地电脑确认备份文件存在：

```bash
ls -lh ./incident-backup
```

至少应有：

```text
kline.dump      # PostgreSQL kline 数据库备份，最重要
globals.sql     # 可选，数据库全局角色/权限备份
uploads.tgz     # 可选，上传文件备份
```

如果 `kline.dump` 没有下载成功，先不要重装系统。

## 2. 腾讯云控制台设置

重装前在腾讯云控制台做这些事：

1. 给当前系统盘做快照，留作取证和兜底。
2. 重装 Ubuntu 系统。
3. 安全组只开放：

```text
80/tcp   0.0.0.0/0
443/tcp  0.0.0.0/0
22/tcp   你的固定公网 IP/32
```

不要开放：

```text
5432 PostgreSQL
6379 Redis
2375/2376 Docker API
3000 Web
4000 API
```

本项目通过 Nginx 暴露 `80/443`，PostgreSQL、Redis、API、Web 都只应在 Docker 内部网络访问。

## 3. 初始化新系统

登录新系统：

```bash
ssh ubuntu@122.51.95.234
```

安装基础工具并拉取干净代码：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw openssl

sudo mkdir -p /opt/kline-bootcamp
sudo chown -R "$USER:$USER" /opt/kline-bootcamp

git clone -b codex/develop-k-line-simulation-training-system \
  https://github.com/ChenShaoHua6290/kline-bootcamp.git \
  /opt/kline-bootcamp

cd /opt/kline-bootcamp
sudo bash scripts/server-init.sh
```

让当前用户可以使用 Docker：

```bash
sudo usermod -aG docker "$USER"
```

然后退出 SSH 并重新登录，或者执行：

```bash
newgrp docker
```

确认 Docker 可用：

```bash
docker version
docker compose version
```

收紧系统内防火墙的 SSH 来源。把 `<你的公网IP>` 换成你当前办公网络出口 IP：

```bash
sudo ufw delete allow 22/tcp || true
sudo ufw allow from <你的公网IP> to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status verbose
```

## 4. 配置新的环境变量

不要复制旧服务器上的 `.env.production`。从模板创建：

```bash
cd /opt/kline-bootcamp
cp .env.production.example .env.production
```

生成新密钥：

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

编辑配置：

```bash
nano .env.production
```

重点修改：

```text
POSTGRES_PASSWORD=新的强密码
DATABASE_URL=postgresql://postgres:新的强密码@postgres:5432/kline?schema=public

JWT_SECRET=新的随机值
JWT_REFRESH_SECRET=新的随机值
EMAIL_CODE_SECRET=新的随机值
AUTO_INVITE_SECRET=新的随机值

APP_URL=https://1mode.cn
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_API_BASE_URL=/api

SMTP_PASS=新邮箱授权码或新密码
TENCENT_VOD_APP_ID=你的腾讯云 VOD AppID
TENCENT_VOD_PLAYER_SIGN_KEY=新的或确认安全的播放器签名密钥
```

所有旧密码、旧 token、旧 secret 都按泄露处理并轮换。

校验 compose 配置：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config >/tmp/compose.config
```

确认没有公网映射数据库端口：

```bash
grep -n "5432:5432\|6379:6379" /tmp/compose.config || echo "OK: no public pg/redis ports"
```

## 5. 上传备份到新服务器

在本地电脑执行：

```bash
scp -r ./incident-backup ubuntu@122.51.95.234:/home/ubuntu/incident-backup
```

如果使用密钥：

```bash
scp -i /path/to/your-key.pem -r ./incident-backup ubuntu@122.51.95.234:/home/ubuntu/incident-backup
```

在服务器确认：

```bash
ls -lh ~/incident-backup
```

## 6. 签发或恢复 HTTPS 证书

仓库里的 `nginx/default.conf` 使用这些证书路径：

```text
/etc/letsencrypt/live/1mode.cn/1mode.cn_bundle.crt
/etc/letsencrypt/live/1mode.cn/1mode.cn.key
```

这些路径映射自项目目录：

```text
/opt/kline-bootcamp/certbot/conf
```

### 6.1 使用 Let's Encrypt 新签证书

确认域名已经解析到新服务器公网 IP：

```bash
dig +short A 1mode.cn
dig +short A www.1mode.cn
```

准备目录：

```bash
cd /opt/kline-bootcamp
mkdir -p certbot/www certbot/conf
```

用临时 Nginx 只服务 ACME challenge：

```bash
docker run -d --name acme-http \
  -p 80:80 \
  -v "$(pwd)/certbot/www:/usr/share/nginx/html:ro" \
  nginx:1.27-alpine
```

申请证书：

```bash
docker run --rm \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d 1mode.cn -d www.1mode.cn \
  --email 你的邮箱 \
  --agree-tos \
  --no-eff-email
```

停止临时 Nginx：

```bash
docker rm -f acme-http
```

Let's Encrypt 默认文件名是 `fullchain.pem` 和 `privkey.pem`。为了兼容当前 Nginx 配置，创建软链接：

```bash
cd /opt/kline-bootcamp/certbot/conf/live/1mode.cn
ln -sf fullchain.pem 1mode.cn_bundle.crt
ln -sf privkey.pem 1mode.cn.key
```

### 6.2 如果你有原证书文件

如果你不是用 Let's Encrypt，而是腾讯云 SSL 证书，放到：

```bash
mkdir -p /opt/kline-bootcamp/certbot/conf/live/1mode.cn
```

并确保文件名为：

```text
/opt/kline-bootcamp/certbot/conf/live/1mode.cn/1mode.cn_bundle.crt
/opt/kline-bootcamp/certbot/conf/live/1mode.cn/1mode.cn.key
```

## 7. 启动数据库并恢复数据

只启动 PostgreSQL 和 Redis：

```bash
cd /opt/kline-bootcamp
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

复制备份进 PostgreSQL 容器：

```bash
docker cp ~/incident-backup/kline.dump kline-postgres:/tmp/kline.dump
```

恢复数据库：

```bash
docker exec -i kline-postgres pg_restore \
  -U postgres \
  -d kline \
  --clean \
  --if-exists \
  --no-owner \
  /tmp/kline.dump
```

检查数据库大小和表：

```bash
docker exec -it kline-postgres psql -U postgres -d postgres -c \
"select datname, pg_size_pretty(pg_database_size(datname)) as size from pg_database order by pg_database_size(datname) desc;"

docker exec -it kline-postgres psql -U postgres -d kline -c "\dt"
```

抽查核心数据：

```bash
docker exec -it kline-postgres psql -U postgres -d kline -c \
"select count(*) as users from \"User\";"

docker exec -it kline-postgres psql -U postgres -d kline -c \
"select count(*) as symbols from \"Symbol\";"

docker exec -it kline-postgres psql -U postgres -d kline -c \
"select count(*) as stock_bars from bars_stock;"
```

## 8. 恢复上传文件

如果没有 `uploads.tgz`，跳过本章。

先确认 volume 名称：

```bash
docker volume ls | grep uploads
```

通常是：

```text
kline-bootcamp_uploads
```

恢复：

```bash
docker run --rm \
  -v kline-bootcamp_uploads:/data \
  -v "$HOME/incident-backup:/backup" \
  alpine sh -c 'cd /data && tar xzf /backup/uploads.tgz'
```

如果你的 volume 名称不同，把 `kline-bootcamp_uploads` 替换成实际名称。

## 9. 构建并启动完整服务

从干净代码构建，不使用旧镜像缓存：

```bash
cd /opt/kline-bootcamp
docker compose --env-file .env.production -f docker-compose.prod.yml build --no-cache
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

执行 Prisma 迁移：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

查看服务：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 api
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 web
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 nginx
```

## 10. 验证访问和安全

验证 Web 容器不再返回恶意跳转：

```bash
docker exec kline-web node -e "const http=require('http');const req=http.request({host:'127.0.0.1',port:3000,path:'/',method:'HEAD'},res=>{console.log(res.statusCode,res.headers)});req.on('error',e=>{console.error(e);process.exit(1)});req.end();"
```

验证域名：

```bash
curl -Ik --max-redirs 0 https://1mode.cn/
curl -Ik --max-redirs 0 https://www.1mode.cn/
curl -Ik https://1mode.cn/api/health
```

确认不出现：

```text
rebirthstress.at
```

确认端口：

```bash
sudo ss -lntup
```

正常只应看到公网监听：

```text
:22
:80
:443
```

不要出现公网监听：

```text
0.0.0.0:5432
0.0.0.0:6379
0.0.0.0:2375
0.0.0.0:3000
0.0.0.0:4000
```

确认 UFW：

```bash
sudo ufw status verbose
```

## 11. 设置证书续期

```bash
crontab -e
```

添加：

```cron
15 3 * * * cd /opt/kline-bootcamp && docker run --rm -v /opt/kline-bootcamp/certbot/www:/var/www/certbot -v /opt/kline-bootcamp/certbot/conf:/etc/letsencrypt certbot/certbot renew --webroot -w /var/www/certbot --quiet && docker compose --env-file .env.production -f docker-compose.prod.yml exec -T nginx nginx -s reload
```

测试续期：

```bash
cd /opt/kline-bootcamp
docker run --rm \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot renew --webroot \
  -w /var/www/certbot \
  --dry-run
```

## 12. 设置数据库备份

创建备份目录：

```bash
mkdir -p /opt/kline-bootcamp/backups
```

手动测试一次：

```bash
cd /opt/kline-bootcamp
docker exec -t kline-postgres pg_dump -U postgres -d kline -Fc -f /tmp/kline_latest.dump
docker cp kline-postgres:/tmp/kline_latest.dump backups/kline_latest.dump
ls -lh backups/kline_latest.dump
```

添加定时备份：

```bash
crontab -e
```

添加：

```cron
0 4 * * * cd /opt/kline-bootcamp && docker exec -t kline-postgres pg_dump -U postgres -d kline -Fc -f /tmp/kline_auto.dump && docker cp kline-postgres:/tmp/kline_auto.dump /opt/kline-bootcamp/backups/kline_$(date +\%F_\%H\%M\%S).dump
```

重要：定时备份还需要定期下载到本地电脑或对象存储。只放在同一台服务器上不算可靠备份。

## 13. 重装后的账号和密钥清单

必须轮换：

```text
服务器 SSH key
服务器登录密码
POSTGRES_PASSWORD
JWT_SECRET
JWT_REFRESH_SECRET
EMAIL_CODE_SECRET
AUTO_INVITE_SECRET
SMTP_PASS
腾讯云 API Key
腾讯云 VOD Player Sign Key
GitHub token / deploy key
CI/CD token
```

建议开启：

```text
腾讯云账号 MFA
GitHub MFA
域名注册商 MFA
云安全组最小开放
SSH 只允许密钥登录
root 禁止 SSH 登录
```

## 14. 常见问题

### Nginx 起不来，提示证书文件不存在

检查：

```bash
ls -lah certbot/conf/live/1mode.cn
```

如果只有 `fullchain.pem` 和 `privkey.pem`，创建兼容软链接：

```bash
cd /opt/kline-bootcamp/certbot/conf/live/1mode.cn
ln -sf fullchain.pem 1mode.cn_bundle.crt
ln -sf privkey.pem 1mode.cn.key
```

然后重启：

```bash
cd /opt/kline-bootcamp
docker compose --env-file .env.production -f docker-compose.prod.yml up -d nginx
```

### pg_restore 很慢

你的数据库曾经约 24 GB，恢复几十分钟到数小时都正常。另开窗口观察：

```bash
docker exec kline-postgres ps aux | grep '[p]g_restore'
docker exec -it kline-postgres psql -U postgres -d postgres -c \
"select datname, pg_size_pretty(pg_database_size(datname)) from pg_database order by pg_database_size(datname) desc;"
```

### 域名仍然跳恶意地址

逐层判断：

```bash
curl -Ik --max-redirs 0 https://1mode.cn/
docker exec kline-web node -e "const http=require('http');const req=http.request({host:'127.0.0.1',port:3000,path:'/',method:'HEAD'},res=>{console.log(res.statusCode,res.headers)});req.end();"
docker exec kline-nginx nginx -T 2>&1 | grep -iE 'rebirthstress|return 30|rewrite|proxy_redirect'
```

如果新系统仍跳，优先检查 DNS/CDN/域名解析平台、浏览器缓存、Cloudflare/腾讯云边缘规则。

## 15. 成功标准

满足以下条件才算恢复完成：

```text
https://1mode.cn 正常访问
https://www.1mode.cn 正常访问
不再出现 rebirthstress.at
用户能登录
课程/训练数据存在
视频或上传文件能访问
PostgreSQL/Redis 不暴露公网
所有旧密钥已轮换
定时证书续期已配置
定时数据库备份已配置
腾讯云/GitHub/域名账号已开启 MFA
```
