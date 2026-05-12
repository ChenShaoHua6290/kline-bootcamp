import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DataImportController } from './data-import.controller';
import { DataImportService } from './data-import.service';
import { DataImportProcessor } from './data-import.processor';
import { CommandRunnerService } from './services/command-runner.service';
import { DataDownloadService } from './services/data-download.service';
import { DataUnzipService } from './services/data-unzip.service';
import { DataNormalizeService } from './services/data-normalize.service';
import { DataImportService as BarsImportService } from './services/data-import.service';
import { DataVerifyService } from './services/data-verify.service';
import { SymbolStatsService } from './services/symbol-stats.service';

@Module({
  imports: [AuthModule],
  controllers: [DataImportController],
  providers: [
    DataImportService,
    DataImportProcessor,
    CommandRunnerService,
    DataDownloadService,
    DataUnzipService,
    DataNormalizeService,
    BarsImportService,
    DataVerifyService,
    SymbolStatsService,
  ],
  exports: [DataImportService],
})
export class DataImportModule {}
