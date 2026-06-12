import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoryQueryDto } from '../training/dto';
import { TrainingService } from '../training/training.service';
import { AdminService } from './admin.service';
import { AdminResetUserPasswordDto, BanUserDto, CreateInviteCodeDto, UpdateInviteCodeDto, UpdateUserAccessDto, UpdateUserCourseAccessDto } from './dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly trainingService: TrainingService,
  ) {}

  @Get('summary')
  summary() {
    return this.adminService.summary();
  }

  @Get('invitations')
  invitations() {
    return this.adminService.listInvitations();
  }

  @Post('invitations')
  createInvitation(@Req() req: { user: { sub: string } }, @Body() dto: CreateInviteCodeDto) {
    return this.adminService.createInvitation(req.user.sub, dto);
  }

  @Patch('invitations/:id')
  updateInvitation(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: UpdateInviteCodeDto) {
    return this.adminService.updateInvitation(req.user.sub, id, dto);
  }

  @Delete('invitations/:id')
  deleteInvitation(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.adminService.deleteInvitation(req.user.sub, id);
  }

  @Get('users')
  users(@Query('q') q?: string) {
    return this.adminService.listUsers(q);
  }

  @Delete('users/:id')
  deleteUser(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.adminService.deleteUser(req.user.sub, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Patch('users/:id/ban')
  banUser(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(req.user.sub, id, dto);
  }

  @Patch('users/:id/unban')
  unbanUser(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.adminService.unbanUser(req.user.sub, id);
  }

  @Patch('users/:id/access')
  updateUserAccess(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: UpdateUserAccessDto) {
    return this.adminService.updateUserAccess(req.user.sub, id, dto);
  }

  @Get('users/:id/course-access')
  userCourseAccess(@Param('id') id: string) {
    return this.adminService.getUserCourseAccess(id);
  }

  @Patch('users/:id/course-access')
  updateUserCourseAccess(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: UpdateUserCourseAccessDto) {
    return this.adminService.updateUserCourseAccess(req.user.sub, id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Patch('users/:id/reset-password')
  resetUserPassword(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: AdminResetUserPasswordDto) {
    return this.adminService.resetUserPassword(req.user.sub, id, dto);
  }

  @Get('users/:id/history')
  userHistory(@Param('id') id: string, @Query() query: HistoryQueryDto) {
    return this.trainingService.history(id, query);
  }

  @Get('users/:id/training/:sessionId')
  userTrainingDetail(@Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.trainingService.getByIdForAdmin(id, sessionId);
  }

  @Get('users/:id/training/:sessionId/review')
  userTrainingReview(@Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.trainingService.getReviewDetailForAdmin(id, sessionId);
  }

  @Get('users/:id/training/:sessionId/bars')
  userTrainingBars(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Query('timeframe') timeframe: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.trainingService.getBarsWindow(id, sessionId, timeframe, from, to);
  }
}
