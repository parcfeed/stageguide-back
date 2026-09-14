import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OffresSauvegardeesController } from './offres-sauvegardees.controller';
import { OffresSauvegardeesService } from './offres-sauvegardees.service';

@Module({
  imports: [PrismaModule],
  controllers: [OffresSauvegardeesController],
  providers: [OffresSauvegardeesService],
})
export class OffresSauvegardeesModule {}
