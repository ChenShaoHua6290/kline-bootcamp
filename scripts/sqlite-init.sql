PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Symbol" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "market" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MarketBar" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "symbolId" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL,
  "openTime" DATETIME NOT NULL,
  "open" REAL NOT NULL,
  "high" REAL NOT NULL,
  "low" REAL NOT NULL,
  "close" REAL NOT NULL,
  "volume" REAL,
  FOREIGN KEY ("symbolId") REFERENCES "Symbol" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MarketBar_symbolId_timeframe_openTime_idx"
ON "MarketBar" ("symbolId", "timeframe", "openTime");

CREATE TABLE IF NOT EXISTS "TrainingSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "drivingTimeframe" TEXT NOT NULL,
  "totalBars" INTEGER NOT NULL,
  "initialVisibleBars" INTEGER NOT NULL,
  "initialBalance" REAL NOT NULL,
  "finalBalance" REAL,
  "isLiquidated" BOOLEAN NOT NULL DEFAULT 0,
  "resetCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "pointer" INTEGER NOT NULL,
  "viewTimeframe" TEXT NOT NULL,
  "barsData" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" DATETIME,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Position" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "sessionId" TEXT NOT NULL UNIQUE,
  "side" TEXT NOT NULL,
  "entryPrice" REAL NOT NULL,
  "positionPercent" REAL NOT NULL,
  "positionAmount" REAL NOT NULL,
  "stopLossRatio" REAL,
  "takeProfitRatio" REAL,
  "stopLossPrice" REAL,
  "takeProfitPrice" REAL,
  "feePaid" REAL NOT NULL,
  "openedAtPointer" INTEGER NOT NULL,
  FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrainingAction" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "sessionId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "timePointer" INTEGER NOT NULL,
  "price" REAL NOT NULL,
  "positionPercent" REAL,
  "stopLossRatio" REAL,
  "takeProfitRatio" REAL,
  "pnl" REAL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingAction_sessionId_createdAt_idx"
ON "TrainingAction" ("sessionId", "createdAt");

CREATE TABLE IF NOT EXISTS "AccountSnapshot" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "sessionId" TEXT NOT NULL,
  "timePointer" INTEGER NOT NULL,
  "balance" REAL NOT NULL,
  "floatingPnl" REAL NOT NULL,
  "totalEquity" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AccountSnapshot_sessionId_timePointer_idx"
ON "AccountSnapshot" ("sessionId", "timePointer");
