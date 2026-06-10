DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DataImportJob'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "DataImportJob" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Symbol'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Symbol" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SymbolDataStats'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "SymbolDataStats" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
