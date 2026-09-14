import { Module } from '@nestjs/common';
import { AdminOffresModule } from './offres/admin-offres.module';
import { AdminPartnerModule } from './partner/partner.module';
import { AdminStatsModule } from './stats/admin-stats.module';
import { AdminUserModule } from './user/user.module';

@Module({
  imports: [AdminUserModule, AdminPartnerModule, AdminStatsModule, AdminOffresModule],
})
export class AdminModule {}
