# K线训练 Web 应用（前后端分离）

## 技术栈
- 前端：React + Vite + `@klinecharts/pro`
- 后端：Java 17 + Spring Boot 3 + Spring Security + JPA
- 数据库：MySQL

## 已实现功能
1. 邮箱注册/登录（JWT 鉴权）。
2. 训练页包含完整操作按钮：加入训练、历史记录、买涨、卖出/做空、平多、平空、下一条、重新开始、结束。
3. 随机双盲训练：先展示 context K 线，按钮推进下一条。
4. 训练侧边栏实时显示账户资金、持仓、盈亏和近期交易记录。
5. 多周期支持：`M15/M30/H1/H2/H4/D1/D2/W1/MN1`。

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
- 行情维护
  - `POST /api/market/instruments`
  - `POST /api/market/candles:batch-upsert`
- 训练
  - `POST /api/training/random`
  - `GET /api/training/{sessionId}/panel`
  - `POST /api/training/{sessionId}/action`
  - `GET /api/training/history`
  - `POST /api/training/{sessionId}/reveal`
