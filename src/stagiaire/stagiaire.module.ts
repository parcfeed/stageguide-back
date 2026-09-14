import { Module } from '@nestjs/common';
import { AlertesModule } from './alertes/alertes.module';
import { CandidaturesModule } from './candidatures/candidatures.module';
import { CertificatsModule } from './certificats/certificats.module';
import { ConventionsModule } from './conventions/conventions.module';
import { CvModule } from './cv/cv.module';
import { EvaluationsEntrepriseModule } from './evaluations-entreprise/evaluations-entreprise.module';
import { FormationsModule } from './formations/formations.module';
import { MentoratStagiaireModule } from './mentorat/mentorat.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ProfilStagiaireModule } from './profil/profil.module';
import { TableauDeBordModule } from './tableau-de-bord/tableau-de-bord.module';

@Module({
  imports: [
    TableauDeBordModule,
    ProfilStagiaireModule,
    PortfolioModule,
    CandidaturesModule,
    MentoratStagiaireModule,
    ConventionsModule,
    FormationsModule,
    CertificatsModule,
    CvModule,
    AlertesModule,
    EvaluationsEntrepriseModule,
  ],
})
export class StagiaireModule {}
