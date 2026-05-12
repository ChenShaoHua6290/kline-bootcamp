import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDataImportJobDto, ListDataImportJobsDto } from './dto';
import { DataImportService } from './data-import.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/data-import')
export class DataImportController {
  constructor(private readonly service: DataImportService) {}

  @Post('jobs')
  createJob(@Req() req: { user: { sub: string } }, @Body() dto: CreateDataImportJobDto) {
    return this.service.createJob(req.user.sub, dto);
  }

  @Get('jobs')
  listJobs(@Query() query: ListDataImportJobsDto) {
    return this.service.listJobs(query);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.service.getJob(id);
  }

  @Post('jobs/:id/retry')
  retryJob(@Param('id') id: string) {
    return this.service.retryJob(id);
  }

  @Post('jobs/:id/cancel')
  cancelJob(@Param('id') id: string) {
    return this.service.cancelJob(id);
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }
}
