import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { BanUserDto, CreateInviteCodeDto, UpdateInviteCodeDto } from './dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Patch('users/:id/ban')
  banUser(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(req.user.sub, id, dto);
  }

  @Patch('users/:id/unban')
  unbanUser(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.adminService.unbanUser(req.user.sub, id);
  }
}

