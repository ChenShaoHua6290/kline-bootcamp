#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/kline-bootcamp"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

if [ "${EUID}" -ne 0 ]; then
  echo "请使用 root 执行: sudo bash scripts/server-init.sh"
  exit 1
fi

log "更新 apt 索引..."
apt-get update -y

log "安装基础依赖..."
apt-get install -y ca-certificates curl gnupg lsb-release git ufw

if ! command -v docker >/dev/null 2>&1; then
  log "安装 Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  log "Docker 已安装，跳过安装步骤。"
fi

systemctl enable docker
systemctl start docker

log "创建部署目录: ${DEPLOY_DIR}"
mkdir -p "$DEPLOY_DIR"

log "配置防火墙 (22/80/443)..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

log "初始化完成。"
log "后续操作："
log "1) cd ${DEPLOY_DIR}"
log "2) git clone <你的仓库地址> ."
log "3) cp .env.production.example .env.production && 编辑配置"
log "4) bash scripts/deploy.sh"
