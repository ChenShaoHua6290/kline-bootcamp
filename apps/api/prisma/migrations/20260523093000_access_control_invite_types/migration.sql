-- enums
DO $$ BEGIN
  CREATE TYPE "InviteCodeType" AS ENUM ('TRIAL', 'PAID', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccessType" AS ENUM ('TRIAL', 'PAID', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccessStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccessPlan" AS ENUM ('NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- InviteCode extension
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "type" "InviteCodeType" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "trialDays" INTEGER;
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "dailyTrainingLimit" INTEGER;
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "paidPlan" "AccessPlan" NOT NULL DEFAULT 'NONE';
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER;

-- User access fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessType" "AccessType" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessStartAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyTrainingLimit" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTrainingUnlimited" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessStatus" "AccessStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentPlan" "AccessPlan" NOT NULL DEFAULT 'NONE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessInviteCodeId" TEXT;

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_accessInviteCodeId_fkey"
  FOREIGN KEY ("accessInviteCodeId") REFERENCES "InviteCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "User_accessInviteCodeId_idx" ON "User"("accessInviteCodeId");
CREATE INDEX IF NOT EXISTS "User_accessType_accessStatus_idx" ON "User"("accessType", "accessStatus");

-- daily usage
CREATE TABLE IF NOT EXISTS "UserTrainingDailyUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "usageDate" TIMESTAMP(3) NOT NULL,
  "trainingCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserTrainingDailyUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserTrainingDailyUsage_userId_usageDate_key" ON "UserTrainingDailyUsage"("userId", "usageDate");
CREATE INDEX IF NOT EXISTS "UserTrainingDailyUsage_usageDate_idx" ON "UserTrainingDailyUsage"("usageDate");

DO $$ BEGIN
  ALTER TABLE "UserTrainingDailyUsage" ADD CONSTRAINT "UserTrainingDailyUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- access change log
CREATE TABLE IF NOT EXISTS "UserAccessChangeLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "operatorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "oldAccessType" "AccessType",
  "newAccessType" "AccessType",
  "oldAccessPlan" "AccessPlan",
  "newAccessPlan" "AccessPlan",
  "oldExpiresAt" TIMESTAMP(3),
  "newExpiresAt" TIMESTAMP(3),
  "oldAccessStatus" "AccessStatus",
  "newAccessStatus" "AccessStatus",
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAccessChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserAccessChangeLog_userId_createdAt_idx" ON "UserAccessChangeLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserAccessChangeLog_operatorUserId_createdAt_idx" ON "UserAccessChangeLog"("operatorUserId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "UserAccessChangeLog" ADD CONSTRAINT "UserAccessChangeLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UserAccessChangeLog" ADD CONSTRAINT "UserAccessChangeLog_operatorUserId_fkey"
  FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- backfill defaults for existing users
UPDATE "User"
SET "accessType" = 'INTERNAL',
    "accessStatus" = 'ACTIVE',
    "currentPlan" = 'NONE',
    "isTrainingUnlimited" = TRUE
WHERE "accessType" IS NULL;
