# K线训练 Web 应用（前后端分离）

## 技术栈
- 前端：React + Vite + `@klinecharts/pro`
- 后端：Java 17 + Spring Boot 3 + Spring Security + JPA
- 数据库：MySQL

## 已实现功能
1. 邮箱注册/登录（JWT 鉴权）。
2. 登录成功进入首页，默认空图。
3. 支持随机双盲训练：先给历史 context K 线，再点击“揭晓答案”返回未来 target K 线。
4. 多周期支持：`M15/M30/H1/H2/H4/D1/D2/W1/MN1`（对应你提出的 15min/30min/1h/2h/4h/D/2D/W/M）。
5. 支持多资产类别筛选：`FUTURES/STOCK/FOREX/CRYPTO/GOLD`。

## K线数据后台维护方案（当前实现）
后端采用三层数据模型：
- `instruments`：交易品种主数据（symbol、类别）。
- `kline_candles`：标准化K线（instrument + timeframe + open_time 唯一）。
- `training_sessions`：记录每次随机训练切片（用户、品种、周期、切片偏移、context/target 长度）。

### 数据导入接口
- `POST /api/market/instruments`：新增/更新品种。
- `POST /api/market/candles:batch-upsert`：批量导入K线（按唯一键 upsert）。

建议生产中由定时任务拉取交易所/券商行情，再按该接口写入，保证训练数据可持续更新。

## 双盲随机训练流程
1. 前端调用 `POST /api/training/random`，可带 `assetClass/symbol/timeframe/contextSize/targetSize`。
2. 后端在满足样本量条件的数据里随机切窗，返回 only context（历史段）。
3. 用户做判断后，前端调用 `POST /api/training/{sessionId}/reveal`。
4. 后端返回 target（未来段）用于复盘。

这样可以实现“看不到未来”的双盲训练。

## 启动
### 后端
1. 创建数据库：`kline_training`
2. 修改 `backend/src/main/resources/application.yml` 中 MySQL 用户名和密码。
3. 启动：
   ```bash
   cd backend
   mvn spring-boot:run
   ```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## 关键接口
- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- 训练
  - `POST /api/training/random`
  - `POST /api/training/{sessionId}/reveal`
- 行情维护
  - `POST /api/market/instruments`
  - `POST /api/market/candles:batch-upsert`
