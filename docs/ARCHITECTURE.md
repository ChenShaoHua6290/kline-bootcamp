# K线双盲训练系统 MVP 设计

## 1) 项目目录结构

- `apps/api` NestJS + Prisma 后端
- `apps/web` Next.js 前端
- `docs` 设计文档

## 2) 前后端模块划分

### 后端
- `auth`: 注册/登录/JWT
- `users`: 用户数据访问
- `training`: 会话启动、推进、交易、结束、重置
- `market-data`: 历史数据随机抽样（MVP 支持合成数据兜底）
- `replay`: 复盘域（MVP 先由 training 查询承载）
- `account`: 账户域（MVP 先由 training 引擎承载）

### 前端
- `TopNav`, `TrainingConfigModal`, `KLineChart`, `TimeframeSwitcher`
- `TrainingInfoPanel`, `AccountPanel`, `TradePanel`
- `ReplayChart`, `TradeHistoryList`, `ReplayStatsPanel`

## 3) 数据库模型设计
- `User`
- `TrainingSession`
- `Position`
- `TrainingAction`
- `AccountSnapshot`
- `Symbol`, `MarketBar`

详见 `apps/api/prisma/schema.prisma`。

## 4) 核心训练状态流
1. 登录后点击开始训练 -> `POST /training/start`
2. 初始化随机标的 + 连续K线，创建 session，指针定位到初始可见段末端
3. 用户操作 `BUY_LONG/BUY_SHORT/CLOSE/HOLD` -> `POST /training/:id/action`
4. 引擎按照当前可见收盘价处理开平仓/手续费/止盈止损
5. 每次 action 后推进一个 driving timeframe bar，写入快照
6. 命中结束条件（数据结束/主动结束/爆仓）更新 session 状态
7. 复盘页读取 `GET /training/:id`
