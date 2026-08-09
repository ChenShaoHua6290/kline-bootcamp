-- CreateTable
CREATE TABLE "registration_email_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_email_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_email_codes_email_createdAt_idx" ON "registration_email_codes"("email", "createdAt");

-- CreateIndex
CREATE INDEX "registration_email_codes_expiresAt_idx" ON "registration_email_codes"("expiresAt");
