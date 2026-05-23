DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'DataImportJob'
  ) THEN
    ALTER TABLE "DataImportJob" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Symbol'
  ) THEN
    ALTER TABLE "Symbol" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SymbolDataStats'
  ) THEN
    ALTER TABLE "SymbolDataStats" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
