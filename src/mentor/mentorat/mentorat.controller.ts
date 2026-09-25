import { Body, Controller, Get, Header, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { PlanifierSessionMentoratDto } from './dto/planifier-session-mentorat.dto';
import { RepondreDemandeMentoratDto } from './dto/repondre-demande-mentorat.dto';
import { SoumettreEvaluationDto } from './dto/soumettre-evaluation.dto';
import { MentoratMentorService } from './mentorat.service';

@ApiTags('mentor')
@ApiBearerAuth()
@Controller('mentor/mentorat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MENTOR)
export class MentoratMentorController {
  constructor(private readonly mentoratService: MentoratMentorService) {}

  @ApiOperation({ summary: 'Liste les demandes de mentorat adressees au mentor' })
  @Get('demandes')
  async listerDemandes(@CurrentUser() utilisateur: { id: string }) {
    return this.mentoratService.listerDemandes(utilisateur.id);
  }

  @ApiOperation({ summary: 'Repond a une demande de mentorat' })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de mentorat' })
  @Patch('demandes/:id/reponse')
  async repondre(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') demandeId: string,
    @Body() donnees: RepondreDemandeMentoratDto,
  ) {
    return this.mentoratService.repondre(utilisateur.id, demandeId, donnees);
  }

  @ApiOperation({ summary: 'Liste les sessions planifiées par le mentor' })
  @Get('sessions')
  async listerSessions(@CurrentUser() utilisateur: { id: string }) {
    return this.mentoratService.listerSessions(utilisateur.id);
  }

  @ApiOperation({ summary: 'Planifie une session de mentorat avec un stagiaire' })
  @Post('sessions')
  async planifierSession(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: PlanifierSessionMentoratDto,
  ) {
    return this.mentoratService.planifierSession(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Soumet une evaluation pour un stagiaire mentoré' })
  @Post('evaluations')
  async soumettreEvaluation(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: SoumettreEvaluationDto,
  ) {
    return this.mentoratService.soumettreEvaluation(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Exporte une session de mentorat au format iCal (.ics)' })
  @ApiParam({ name: 'id', description: 'Identifiant de la session de mentorat' })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="session-mentorat.ics"')
  @Get('sessions/:id/ical')
  async exportIcal(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') sessionId: string,
  ) {
    return this.mentoratService.exportIcalSession(utilisateur.id, sessionId);
  }
}
