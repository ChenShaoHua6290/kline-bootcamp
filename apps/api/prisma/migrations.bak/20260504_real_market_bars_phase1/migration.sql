-- Phase 1: real historical kline foundation
-- Target: PostgreSQL

BEGIN;

-- 1) symbols: change uniqueness from code-only to (market, code)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Symbol_code_key'
  ) THEN
    ALTER TABLE "Symbol" DROP CONSTRAINT "Symbol_code_key";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Symbol_market_code_key'
  ) THEN
    ALTER TABLE "Symbol" ADD CONSTRAINT "Symbol_market_code_key" UNIQUE ("market", "code");
  END IF;
END $$;

-- 2) add symbolId to TrainingSession for forward compatibility
ALTER TABLE "TrainingSession"
  ADD COLUMN IF NOT EXISTS "symbolId" TEXT;

-- 3) create bars tables
CREATE TABLE IF NOT EXISTS "bars_crypto" (
  "id" TEXT PRIMARY KEY,
  "symbolId" TEXT NOT NULL REFERENCES "Symbol"("id"),
  "timeframe" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "open" DOUBLE PRECISION NOT NULL,
  "high" DOUBLE PRECISION NOT NULL,
  "low" DOUBLE PRECISION NOT NULL,
  "close" DOUBLE PRECISION NOT NULL,
  "volume" DOUBLE PRECISION,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bars_stock" (
  "id" TEXT PRIMARY KEY,
  "symbolId" TEXT NOT NULL REFERENCES "Symbol"("id"),
  "timeframe" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "open" DOUBLE PRECISION NOT NULL,
  "high" DOUBLE PRECISION NOT NULL,
  "low" DOUBLE PRECISION NOT NULL,
  "close" DOUBLE PRECISION NOT NULL,
  "volume" DOUBLE PRECISION,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bars_forex" (
  "id" TEXT PRIMARY KEY,
  "symbolId" TEXT NOT NULL REFERENCES "Symbol"("id"),
  "timeframe" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "open" DOUBLE PRECISION NOT NULL,
  "high" DOUBLE PRECISION NOT NULL,
  "low" DOUBLE PRECISION NOT NULL,
  "close" DOUBLE PRECISION NOT NULL,
  "volume" DOUBLE PRECISION,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bars_futures" (
  "id" TEXT PRIMARY KEY,
  "symbolId" TEXT NOT NULL REFERENCES "Symbol"("id"),
  "timeframe" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "open" DOUBLE PRECISION NOT NULL,
  "high" DOUBLE PRECISION NOT NULL,
  "low" DOUBLE PRECISION NOT NULL,
  "close" DOUBLE PRECISION NOT NULL,
  "volume" DOUBLE PRECISION,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bars_gold" (
  "id" TEXT PRIMARY KEY,
  "symbolId" TEXT NOT NULL REFERENCES "Symbol"("id"),
  "timeframe" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "open" DOUBLE PRECISION NOT NULL,
  "high" DOUBLE PRECISION NOT NULL,
  "low" DOUBLE PRECISION NOT NULL,
  "close" DOUBLE PRECISION NOT NULL,
  "volume" DOUBLE PRECISION,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4) unique constraints + indexes
CREATE UNIQUE INDEX IF NOT EXISTS "bars_crypto_symbolId_timeframe_timestamp_key"
ON "bars_crypto" ("symbolId", "timeframe", "timestamp");
CREATE INDEX IF NOT EXISTS "bars_crypto_symbolId_timeframe_timestamp_idx"
ON "bars_crypto" ("symbolId", "timeframe", "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS "bars_stock_symbolId_timeframe_timestamp_key"
ON "bars_stock" ("symbolId", "timeframe", "timestamp");
CREATE INDEX IF NOT EXISTS "bars_stock_symbolId_timeframe_timestamp_idx"
ON "bars_stock" ("symbolId", "timeframe", "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS "bars_forex_symbolId_timeframe_timestamp_key"
ON "bars_forex" ("symbolId", "timeframe", "timestamp");
CREATE INDEX IF NOT EXISTS "bars_forex_symbolId_timeframe_timestamp_idx"
ON "bars_forex" ("symbolId", "timeframe", "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS "bars_futures_symbolId_timeframe_timestamp_key"
ON "bars_futures" ("symbolId", "timeframe", "timestamp");
CREATE INDEX IF NOT EXISTS "bars_futures_symbolId_timeframe_timestamp_idx"
ON "bars_futures" ("symbolId", "timeframe", "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS "bars_gold_symbolId_timeframe_timestamp_key"
ON "bars_gold" ("symbolId", "timeframe", "timestamp");
CREATE INDEX IF NOT EXISTS "bars_gold_symbolId_timeframe_timestamp_idx"
ON "bars_gold" ("symbolId", "timeframe", "timestamp");

COMMIT;

