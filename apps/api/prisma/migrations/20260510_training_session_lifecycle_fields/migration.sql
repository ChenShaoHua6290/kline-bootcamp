BEGIN;

ALTER TABLE "TrainingSession"
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "terminatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "liquidatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill for existing rows:
-- 1) startedAt/lastActiveAt fallback
UPDATE "TrainingSession"
SET "startedAt" = COALESCE("startedAt", "createdAt"),
    "lastActiveAt" = COALESCE("lastActiveAt", "endedAt", "createdAt");

-- 2) map legacy ENDED to COMPLETED to keep lifecycle semantics consistent
UPDATE "TrainingSession"
SET "status" = 'COMPLETED'
WHERE "status" = 'ENDED';

-- 3) backfill terminal timestamps by status where missing
UPDATE "TrainingSession"
SET "completedAt" = COALESCE("completedAt", "endedAt")
WHERE "status" = 'COMPLETED';

UPDATE "TrainingSession"
SET "liquidatedAt" = COALESCE("liquidatedAt", "endedAt")
WHERE "status" = 'LIQUIDATED';

UPDATE "TrainingSession"
SET "terminatedAt" = COALESCE("terminatedAt", "endedAt")
WHERE "status" = 'TERMINATED';

COMMIT;

