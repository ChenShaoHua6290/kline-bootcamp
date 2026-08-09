import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrainingService } from '../training/training.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('leaderboard')
  leaderboard(@Req() req: { user: { sub: string } }, @Query('limit') limit?: string) {
    const parsed = Number(limit ?? 10);
    const safeLimit = Number.isFinite(parsed) ? parsed : 10;
    return this.trainingService.getLeaderboard(req.user.sub, safeLimit);
  }
}
