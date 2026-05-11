-- Add nickname for user profile display
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;

-- History query performance indexes
CREATE INDEX "TrainingSession_userId_createdAt_idx" ON "TrainingSession"("userId", "createdAt");
CREATE INDEX "TrainingSession_userId_endedAt_idx" ON "TrainingSession"("userId", "endedAt");
CREATE INDEX "TrainingSession_userId_status_idx" ON "TrainingSession"("userId", "status");
