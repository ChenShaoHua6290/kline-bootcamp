-- Remove legacy admin data-import job persistence
-- Safe to run multiple times.

DROP TABLE IF EXISTS "DataImportJob";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataImportJobStatus') THEN
    DROP TYPE "DataImportJobStatus";
  END IF;
END $$;
