import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinishTrainingDto, HistoryQueryDto, SaveTrainingReviewDto, StartTrainingDto, TrainingActionDto } from './dto';
import { TrainingService } from './training.service';

@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('start')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  start(@Req() req: { user: { sub: string } }, @Body() dto: StartTrainingDto) {
    return this.trainingService.start(req.user.sub, dto);
  }

  @Post(':id/next')
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  next(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.next(req.user.sub, id);
  }

  @Post(':id/action')
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  action(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: TrainingActionDto) {
    return this.trainingService.action(req.user.sub, id, dto);
  }

  @Post(':id/end')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  end(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.end(req.user.sub, id);
  }

  @Post(':id/finish')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  finish(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: FinishTrainingDto) {
    return this.trainingService.finish(req.user.sub, id, dto.reason);
  }

  @Post(':id/reset-balance')
  resetBalance(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.resetBalance(req.user.sub, id);
  }

  @Post('reset-account')
  resetAccount(@Req() req: { user: { sub: string } }) {
    return this.trainingService.resetAccountBalance(req.user.sub);
  }

  @Get('history')
  history(@Req() req: { user: { sub: string } }, @Query() query: HistoryQueryDto) {
    return this.trainingService.history(req.user.sub, query);
  }

  @Get('profile')
  profile(@Req() req: { user: { sub: string } }) {
    return this.trainingService.profileStats(req.user.sub);
  }

  @Get('dashboard')
  dashboard(@Req() req: { user: { sub: string } }) {
    return this.trainingService.dashboard(req.user.sub);
  }

  @Get('active')
  active(@Req() req: { user: { sub: string } }) {
    return this.trainingService.getActive(req.user.sub);
  }

  @Get(':id')
  detail(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.getById(req.user.sub, id);
  }

  @Get(':id/review')
  reviewDetail(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.getReviewDetail(req.user.sub, id);
  }

  @Post(':id/review')
  saveReview(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: SaveTrainingReviewDto) {
    return this.trainingService.saveReview(req.user.sub, id, dto);
  }

  @Get(':id/bars')
  bars(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
    @Query('timeframe') timeframe: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.trainingService.getBarsWindow(req.user.sub, id, timeframe, from, to);
  }
}
