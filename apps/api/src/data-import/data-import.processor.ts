import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { DataImportQueuePayload } from './data-import.service';
import { DataDownloadService } from './services/data-download.service';
import { DataUnzipService } from './services/data-unzip.service';
import { DataNormalizeService } from './services/data-normalize.service';
import { DataImportService as BarsImportService } from './services/data-import.service';
import { DataVerifyService } from './services/data-verify.service';
import { SymbolStatsService } from './services/symbol-stats.service';
import { CommandRunnerService } from './services/command-runner.service';

@Injectable()
export class DataImportProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<DataImportQueuePayload> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly downloadService: DataDownloadService,
    private readonly unzipService: DataUnzipService,
    private readonly normalizeService: DataNormalizeService,
    private readonly barsImportService: BarsImportService,
    private readonly verifyService: DataVerifyService,
    private readonly symbolStatsService: SymbolStatsService,
    private readonly runner: CommandRunnerService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<DataImportQueuePayload>(
      'data-import-jobs',
      async (job) => {
        await this.runJob(job);
      },
      {
        connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
        concurrency: 1,
      },
    );
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
  }

  private async setStatus(id: string, status: any, extra?: Record<string, unknown>) {
    await this.prisma.dataImportJob.update({ where: { id }, data: { status, ...(extra ?? {}) } as any });
  }

  private async runJob(job: Job<DataImportQueuePayload>) {
    const payload = job.data;
    const jobId = payload.jobId;

    try {
      await this.setStatus(jobId, 'DOWNLOADING', { startedAt: new Date(), errorMessage: null });
      if (payload.market === 'crypto' && payload.source === 'binance') {
        const dl = await this.downloadService.downloadBinance(
          payload.startMonth ?? '2023-01',
          payload.endMonth ?? '2025-05',
          payload.symbols,
          payload.interval,
        );
        await this.prisma.dataImportJob.update({
          where: { id: jobId },
          data: { totalFiles: Number(dl?.successCount ?? 0) + Number(dl?.skipCount ?? 0), downloadedFiles: Number(dl?.successCount ?? 0) },
        });
      }

      await this.setStatus(jobId, 'UNZIPPING');
      await this.unzipService.unzipAll();

      await this.setStatus(jobId, 'NORMALIZING');
      const normalized = await this.normalizeService.normalizeAll(payload.symbols);
      await this.prisma.dataImportJob.update({
        where: { id: jobId },
        data: { normalizedFiles: Number(normalized?.fileCount ?? 0) },
      });

      await this.setStatus(jobId, 'IMPORTING');
      const imported = await this.barsImportService.importAll(payload.symbols);
      const summary = Array.isArray(imported?.summary) ? imported.summary : [];
      const importedRows = summary.reduce((n: number, x: any) => n + Number(x.importedCount ?? 0), 0);
      const skippedRows = summary.reduce((n: number, x: any) => n + Number(x.skippedCount ?? 0), 0);
      await this.prisma.dataImportJob.update({ where: { id: jobId }, data: { importedRows, skippedRows } });

      if (payload.autoAggregate) {
        await this.setStatus(jobId, 'AGGREGATING');
        await this.runner.run('npm', ['run', 'data:aggregate']);
      }

      await this.verifyService.verifyAll();
      await this.symbolStatsService.refreshAll();

      await this.setStatus(jobId, 'COMPLETED', { finishedAt: new Date() });
    } catch (err) {
      await this.setStatus(jobId, 'FAILED', {
        errorMessage: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      });
      throw err;
    }
  }
}
