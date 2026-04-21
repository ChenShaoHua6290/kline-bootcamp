import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StartTrainingDto, TrainingActionDto } from './dto';
import { TrainingService } from './training.service';

@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('start')
  start(@Req() req: { user: { sub: string } }, @Body() dto: StartTrainingDto) {
    return this.trainingService.start(req.user.sub, dto);
  }

  @Post(':id/next')
  next(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.next(req.user.sub, id);
  }

  @Post(':id/action')
  action(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: TrainingActionDto) {
    return this.trainingService.action(req.user.sub, id, dto);
  }

  @Post(':id/end')
  end(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.end(req.user.sub, id);
  }

  @Post(':id/reset-balance')
  resetBalance(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.resetBalance(req.user.sub, id);
  }

  @Get('history')
  history(@Req() req: { user: { sub: string } }) {
    return this.trainingService.history(req.user.sub);
  }

  @Get(':id')
  detail(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.trainingService.getById(req.user.sub, id);
  }
}
