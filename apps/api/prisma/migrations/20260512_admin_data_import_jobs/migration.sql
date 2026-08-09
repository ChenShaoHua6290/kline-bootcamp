-- Symbol extension (compatible additive fields)
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "exchange" TEXT;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "baseAsset" TEXT;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "quoteAsset" TEXT;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "Symbol" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- enum for import job status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataImportJobStatus') THEN
    CREATE TYPE "DataImportJobStatus" AS ENUM (
      'PENDING','DOWNLOADING','UNZIPPING','NORMALIZING','IMPORTING','AGGREGATING','COMPLETED','FAILED','CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DataImportJob" (
  "id" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "symbols" JSONB NOT NULL,
  "interval" TEXT NOT NULL,
  "startMonth" TEXT,
  "endMonth" TEXT,
  "status" "DataImportJobStatus" NOT NULL DEFAULT 'PENDING',
  "totalFiles" INTEGER NOT NULL DEFAULT 0,
  "downloadedFiles" INTEGER NOT NULL DEFAULT 0,
  "normalizedFiles" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "failedFiles" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "autoAggregate" BOOLEAN NOT NULL DEFAULT false,
  "overwrite" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DataImportJob_status_createdAt_idx" ON "DataImportJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "DataImportJob_createdBy_createdAt_idx" ON "DataImportJob"("createdBy", "createdAt");

CREATE TABLE IF NOT EXISTS "SymbolDataStats" (
  "id" TEXT NOT NULL,
  "symbolId" TEXT NOT NULL,
  "market" "Market" NOT NULL,
  "exchange" TEXT,
  "symbol" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL,
  "barCount" INTEGER NOT NULL,
  "startTime" TIMESTAMP(3),
  "endTime" TIMESTAMP(3),
  "isTrainable" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SymbolDataStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SymbolDataStats_symbolId_timeframe_key" ON "SymbolDataStats"("symbolId", "timeframe");
CREATE INDEX IF NOT EXISTS "SymbolDataStats_market_symbol_timeframe_idx" ON "SymbolDataStats"("market", "symbol", "timeframe");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SymbolDataStats_symbolId_fkey'
  ) THEN
    ALTER TABLE "SymbolDataStats"
      ADD CONSTRAINT "SymbolDataStats_symbolId_fkey"
      FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
