import { Module } from '@nestjs/common';
import { OffresEmploiModule } from './offres-emploi/offres-emploi.module';
import { OffresSauvegardeesModule } from './offres-sauvegardees/offres-sauvegardees.module';
import { OffresStageModule } from './offres-stage/offres-stage.module';

@Module({
  imports: [OffresStageModule, OffresEmploiModule, OffresSauvegardeesModule],
})
export class OpportunitesModule {}
