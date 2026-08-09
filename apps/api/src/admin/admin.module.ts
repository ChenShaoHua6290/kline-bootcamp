import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrainingModule } from '../training/training.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { QuickInviteController } from './quick-invite.controller';

@Module({
  imports: [AuthModule, TrainingModule],
  controllers: [AdminController, QuickInviteController],
  providers: [AdminService],
})
export class AdminModule {}
