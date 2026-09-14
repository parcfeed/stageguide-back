import { Module } from '@nestjs/common';
import { EvaluationsEntrepriseController } from './evaluations-entreprise.controller';
import { EvaluationsEntrepriseService } from './evaluations-entreprise.service';

@Module({
  controllers: [EvaluationsEntrepriseController],
  providers: [EvaluationsEntrepriseService],
})
export class EvaluationsEntrepriseModule {}
