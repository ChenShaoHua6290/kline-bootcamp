ALTER TABLE "lessons"
ADD COLUMN IF NOT EXISTS "training_assignment" JSONB;

ALTER TABLE "TrainingSession"
ADD COLUMN IF NOT EXISTS "assignment_source" TEXT,
ADD COLUMN IF NOT EXISTS "assignment_id" TEXT,
ADD COLUMN IF NOT EXISTS "assignment_title_snapshot" TEXT,
ADD COLUMN IF NOT EXISTS "assignment_version" INTEGER,
ADD COLUMN IF NOT EXISTS "lesson_id" TEXT,
ADD COLUMN IF NOT EXISTS "lesson_title_snapshot" TEXT,
ADD COLUMN IF NOT EXISTS "training_mode" TEXT,
ADD COLUMN IF NOT EXISTS "attempt_no" INTEGER,
ADD COLUMN IF NOT EXISTS "is_assignment_continuation" BOOLEAN;

CREATE INDEX IF NOT EXISTS "TrainingSession_userId_assignment_source_idx"
ON "TrainingSession"("userId", "assignment_source");

UPDATE "lessons"
SET "training_assignment" = jsonb_build_object(
  'assignmentSource', 'trial',
  'assignmentId', 'TRIAL-01',
  'assignmentTitle', '免费试学：固定模式识别训练',
  'trainingMode', 'mixed',
  'assignmentVersion', 1
)
WHERE id = 'lesson_intro_why_one_mode'
  AND "training_assignment" IS NULL;
