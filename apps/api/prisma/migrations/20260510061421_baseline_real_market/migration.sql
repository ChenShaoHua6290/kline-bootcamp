-- CreateEnum
CREATE TYPE "Market" AS ENUM ('STOCK', 'FOREX', 'FUTURES', 'GOLD', 'CRYPTO');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('OPEN_LONG', 'OPEN_SHORT', 'ADD_LONG', 'ADD_SHORT', 'PARTIAL_CLOSE', 'FULL_CLOSE', 'CLOSE', 'HOLD', 'WAIT', 'TP', 'SL', 'LIQUIDATED', 'END');

-- CreateEnum
CREATE TYPE "PositionSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "CloseReason" AS ENUM ('USER', 'TAKE_PROFIT', 'STOP_LOSS', 'LIQUIDATED', 'END_OF_DATA');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_BAN', 'USER_UNBAN', 'INVITE_CREATE', 'INVITE_UPDATE', 'INVITE_DELETE', 'LOGIN_FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Symbol" (
    "id" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Symbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketBar" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,

    CONSTRAINT "MarketBar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bars_crypto" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bars_crypto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bars_stock" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bars_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bars_forex" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bars_forex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bars_futures" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bars_futures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bars_gold" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bars_gold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "symbolId" TEXT,
    "symbol" TEXT NOT NULL,
    "drivingTimeframe" TEXT NOT NULL,
    "totalBars" INTEGER NOT NULL,
    "initialVisibleBars" INTEGER NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL,
    "finalBalance" DOUBLE PRECISION,
    "isLiquidated" BOOLEAN NOT NULL DEFAULT false,
    "resetCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pointer" INTEGER NOT NULL,
    "viewTimeframe" TEXT NOT NULL,
    "barsData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingReview" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "problemTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "side" "PositionSide" NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "positionPercent" DOUBLE PRECISION NOT NULL,
    "positionAmount" DOUBLE PRECISION NOT NULL,
    "stopLossRatio" DOUBLE PRECISION,
    "takeProfitRatio" DOUBLE PRECISION,
    "stopLossPrice" DOUBLE PRECISION,
    "takeProfitPrice" DOUBLE PRECISION,
    "feePaid" DOUBLE PRECISION NOT NULL,
    "openedAtPointer" INTEGER NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "direction" "PositionSide",
    "timePointer" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION,
    "positionPercent" DOUBLE PRECISION,
    "closePercent" DOUBLE PRECISION,
    "stopLossRatio" DOUBLE PRECISION,
    "takeProfitRatio" DOUBLE PRECISION,
    "avgEntryPriceAfter" DOUBLE PRECISION,
    "positionAmountAfter" DOUBLE PRECISION,
    "realizedPnl" DOUBLE PRECISION,
    "fee" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION,
    "reason" "CloseReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSnapshot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timePointer" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "floatingPnl" DOUBLE PRECISION NOT NULL,
    "totalEquity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCodeRedemption" (
    "id" TEXT NOT NULL,
    "inviteCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCodeRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Symbol_market_code_key" ON "Symbol"("market", "code");

-- CreateIndex
CREATE INDEX "MarketBar_symbolId_timeframe_openTime_idx" ON "MarketBar"("symbolId", "timeframe", "openTime");

-- CreateIndex
CREATE INDEX "bars_crypto_symbolId_timeframe_timestamp_idx" ON "bars_crypto"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "bars_crypto_symbolId_timeframe_timestamp_key" ON "bars_crypto"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "bars_stock_symbolId_timeframe_timestamp_idx" ON "bars_stock"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "bars_stock_symbolId_timeframe_timestamp_key" ON "bars_stock"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "bars_forex_symbolId_timeframe_timestamp_idx" ON "bars_forex"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "bars_forex_symbolId_timeframe_timestamp_key" ON "bars_forex"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "bars_futures_symbolId_timeframe_timestamp_idx" ON "bars_futures"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "bars_futures_symbolId_timeframe_timestamp_key" ON "bars_futures"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "bars_gold_symbolId_timeframe_timestamp_idx" ON "bars_gold"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "bars_gold_symbolId_timeframe_timestamp_key" ON "bars_gold"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingReview_sessionId_key" ON "TrainingReview"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingReview_userId_createdAt_idx" ON "TrainingReview"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Position_sessionId_key" ON "Position"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingAction_sessionId_createdAt_idx" ON "TrainingAction"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountSnapshot_sessionId_timePointer_idx" ON "AccountSnapshot"("sessionId", "timePointer");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCodeRedemption_inviteCodeId_createdAt_idx" ON "InviteCodeRedemption"("inviteCodeId", "createdAt");

-- CreateIndex
CREATE INDEX "InviteCodeRedemption_userId_createdAt_idx" ON "InviteCodeRedemption"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCodeRedemption_inviteCodeId_userId_key" ON "InviteCodeRedemption"("inviteCodeId", "userId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_createdAt_idx" ON "RefreshToken"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityLog_userId_createdAt_idx" ON "SecurityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityLog_action_createdAt_idx" ON "SecurityLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketBar" ADD CONSTRAINT "MarketBar_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bars_crypto" ADD CONSTRAINT "bars_crypto_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bars_stock" ADD CONSTRAINT "bars_stock_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bars_forex" ADD CONSTRAINT "bars_forex_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bars_futures" ADD CONSTRAINT "bars_futures_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bars_gold" ADD CONSTRAINT "bars_gold_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingReview" ADD CONSTRAINT "TrainingReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingReview" ADD CONSTRAINT "TrainingReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAction" ADD CONSTRAINT "TrainingAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSnapshot" ADD CONSTRAINT "AccountSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCodeRedemption" ADD CONSTRAINT "InviteCodeRedemption_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "InviteCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCodeRedemption" ADD CONSTRAINT "InviteCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityLog" ADD CONSTRAINT "SecurityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
