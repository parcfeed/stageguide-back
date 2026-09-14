import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { SoumettreEvaluationEntrepriseDto } from './dto/soumettre-evaluation-entreprise.dto';
import { EvaluationsEntrepriseService } from './evaluations-entreprise.service';

@ApiTags('stagiaire')
@ApiBearerAuth()
@Controller('stagiaire/evaluations-entreprise')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class EvaluationsEntrepriseController {
  constructor(private readonly evaluationsEntrepriseService: EvaluationsEntrepriseService) {}

  @ApiOperation({ summary: 'Liste les évaluations d entreprise reçues par le stagiaire' })
  @Get()
  async lister(@CurrentUser() utilisateur: { id: string }) {
    return this.evaluationsEntrepriseService.listerEvaluations(utilisateur.id);
  }

  @ApiOperation({ summary: 'Soumet une évaluation sur une entreprise' })
  @Post()
  async soumettre(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: SoumettreEvaluationEntrepriseDto,
  ) {
    return this.evaluationsEntrepriseService.soumettreEvaluation(utilisateur.id, donnees);
  }
}
