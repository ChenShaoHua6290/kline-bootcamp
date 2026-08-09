import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { QuickCreateInviteCodeQueryDto } from './dto';

@Controller('admin/invitations/quick')
export class QuickInviteController {
  constructor(private readonly adminService: AdminService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get()
  create(@Query() query: QuickCreateInviteCodeQueryDto) {
    return this.adminService.quickCreateInvitation(query);
  }
}
