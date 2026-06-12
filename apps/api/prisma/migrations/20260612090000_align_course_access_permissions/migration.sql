UPDATE "lessons"
SET "access_level" = 'PREVIEW'
WHERE "is_preview" = TRUE
  AND "access_level" <> 'PREVIEW';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_COURSE_ACCESS_UPDATE';

UPDATE "User"
SET "accessType" = 'PAID',
    "currentPlan" = CASE WHEN "currentPlan" = 'NONE' THEN 'MONTHLY' ELSE "currentPlan" END,
    "accessStartAt" = COALESCE("accessStartAt", NOW()),
    "accessExpiresAt" = CASE
      WHEN "accessExpiresAt" IS NULL OR "accessExpiresAt" <= NOW() THEN NOW() + INTERVAL '1 month'
      ELSE "accessExpiresAt"
    END,
    "dailyTrainingLimit" = NULL,
    "isTrainingUnlimited" = TRUE,
    "accessStatus" = 'ACTIVE'
WHERE "accessType" = 'TRIAL'
  AND "learningAccessLevel" = 'FULL';

CREATE TABLE IF NOT EXISTS "user_course_access" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "access_level" "CourseAccessLevel" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_course_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_course_access_user_id_course_id_key" ON "user_course_access"("user_id", "course_id");
CREATE INDEX IF NOT EXISTS "user_course_access_course_id_idx" ON "user_course_access"("course_id");

DO $$ BEGIN
  ALTER TABLE "user_course_access" ADD CONSTRAINT "user_course_access_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_course_access" ADD CONSTRAINT "user_course_access_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "user_course_access" ("id", "user_id", "course_id", "access_level", "created_at", "updated_at")
SELECT
  'uca_' || md5(u.id || ':' || c.id),
  u.id,
  c.id,
  CASE WHEN u."learningAccessLevel" = 'FULL' THEN 'FULL'::"CourseAccessLevel" ELSE 'TRAINING'::"CourseAccessLevel" END,
  NOW(),
  NOW()
FROM "User" u
CROSS JOIN "courses" c
WHERE u."accessType" = 'PAID'
  AND u."accessStatus" = 'ACTIVE'
  AND (u."accessExpiresAt" IS NULL OR u."accessExpiresAt" > NOW())
ON CONFLICT ("user_id", "course_id") DO NOTHING;
