import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreateDataImportJobDto, ListDataImportJobsDto } from './dto';

export type DataImportQueuePayload = {
  jobId: string;
  market: string;
  source: string;
  symbols: string[];
  interval: string;
  startMonth?: string;
  endMonth?: string;
  autoAggregate: boolean;
  overwrite: boolean;
};

@Injectable()
export class DataImportService implements OnModuleDestroy {
  private readonly queue: Queue<DataImportQueuePayload>;

  constructor(private readonly prisma: PrismaService) {
    this.queue = new Queue<DataImportQueuePayload>('data-import-jobs', {
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  async createJob(adminUserId: string, dto: CreateDataImportJobDto) {
    const symbols = Array.from(new Set(dto.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
    if (symbols.length === 0) throw new Error('symbols required');

    const row = await this.prisma.dataImportJob.create({
      data: {
        market: dto.market,
        source: dto.source,
        symbols,
        interval: dto.interval,
        startMonth: dto.startMonth,
        endMonth: dto.endMonth,
        status: 'PENDING',
        createdBy: adminUserId,
        autoAggregate: dto.autoAggregate ?? false,
        overwrite: dto.overwrite ?? false,
      },
    });

    const payload: DataImportQueuePayload = {
      jobId: row.id,
      market: row.market,
      source: row.source,
      symbols,
      interval: row.interval,
      startMonth: row.startMonth ?? undefined,
      endMonth: row.endMonth ?? undefined,
      autoAggregate: row.autoAggregate,
      overwrite: row.overwrite,
    };

    const opts: JobsOptions = { jobId: row.id };
    await this.queue.add('run-import', payload, opts);

    return row;
  }

  async listJobs(query: ListDataImportJobsDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize ?? 20)));
    const where = query.status ? { status: query.status as any } : {};
    const [total, items] = await Promise.all([
      this.prisma.dataImportJob.count({ where }),
      this.prisma.dataImportJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async getJob(id: string) {
    const row = await this.prisma.dataImportJob.findUnique({ where: { id } });
    if (!row) throw new Error('job not found');
    return row;
  }

  async retryJob(id: string) {
    const row = await this.prisma.dataImportJob.findUnique({ where: { id } });
    if (!row) throw new Error('job not found');
    await this.prisma.dataImportJob.update({
      where: { id },
      data: {
        status: 'PENDING',
        errorMessage: null,
        failedFiles: Prisma.JsonNull,
        finishedAt: null,
      },
    });

    await this.queue.add(
      'run-import',
      {
        jobId: row.id,
        market: row.market,
        source: row.source,
        symbols: row.symbols as string[],
        interval: row.interval,
        startMonth: row.startMonth ?? undefined,
        endMonth: row.endMonth ?? undefined,
        autoAggregate: row.autoAggregate,
        overwrite: row.overwrite,
      },
      { jobId: `${id}-retry-${Date.now()}` },
    );

    return { ok: true };
  }

  async cancelJob(id: string) {
    await this.prisma.dataImportJob.update({ where: { id }, data: { status: 'CANCELLED', finishedAt: new Date() } });
    return { ok: true };
  }

  async stats() {
    const rows = await this.prisma.symbolDataStats.findMany({ orderBy: [{ market: 'asc' }, { symbol: 'asc' }, { timeframe: 'asc' }] });
    return rows;
  }
}
