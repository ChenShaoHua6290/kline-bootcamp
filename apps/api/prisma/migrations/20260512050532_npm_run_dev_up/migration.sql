-- AlterTable
ALTER TABLE "DataImportJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Symbol" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SymbolDataStats" ALTER COLUMN "updatedAt" DROP DEFAULT;
