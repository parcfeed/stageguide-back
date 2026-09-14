import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminOffresController } from './admin-offres.controller';
import { AdminOffresService } from './admin-offres.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminOffresController],
  providers: [AdminOffresService],
  exports: [AdminOffresService],
})
export class AdminOffresModule {}
