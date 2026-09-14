import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateOffreStageDto } from './dto/create-offre-stage.dto';
import { UpdateOffreStageDto } from './dto/update-offre-stage.dto';
import { CreateOffreEmploiDto } from './dto/create-offre-emploi.dto';
import { UpdateOffreEmploiDto } from './dto/update-offre-emploi.dto';
import { PlanifierEntretienDto } from './dto/planifier-entretien.dto';
import { ChangerStatutCandidatureDto } from './dto/changer-statut-candidature.dto';
import { ChangerStatutEntretienDto } from './dto/changer-statut-entretien.dto';
import { SoumettreEvaluationDto } from './dto/soumettre-evaluation.dto';
import { EntrepriseService } from './entreprise.service';

@ApiTags('entreprise')
@ApiBearerAuth()
@Controller('entreprise')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ENTREPRISE)
export class EntrepriseController {
  constructor(private readonly entrepriseService: EntrepriseService) {}

  @ApiOperation({ summary: 'Liste les offres de stage de l entreprise connectee' })
  @Get('offres-stage')
  async listerOffresStage(@CurrentUser() utilisateur: { id: string; email: string; entreprise?: string }) {
    return this.entrepriseService.listerOffresStage(utilisateur);
  }

  @ApiOperation({ summary: 'Publie une offre de stage' })
  @Post('offres-stage')
  async creerOffreStage(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Body() donnees: CreateOffreStageDto,
  ) {
    return this.entrepriseService.creerOffreStage(utilisateur, donnees);
  }

  @ApiOperation({ summary: 'Met a jour une offre de stage existante' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre de stage' })
  @Patch('offres-stage/:id')
  async modifierOffreStage(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Param('id') id: string,
    @Body() donnees: UpdateOffreStageDto,
  ) {
    return this.entrepriseService.modifierOffreStage(utilisateur, id, donnees);
  }

  @ApiOperation({ summary: 'Archive une offre de stage de l entreprise' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre de stage' })
  @Patch('offres-stage/:id/archive')
  async archiverOffreStage(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Param('id') id: string,
  ) {
    return this.entrepriseService.archiverOffreStage(utilisateur, id);
  }

  @ApiOperation({ summary: 'Liste les offres d emploi de l entreprise connectee' })
  @Get('offres-emploi')
  async listerOffresEmploi(@CurrentUser() utilisateur: { id: string; email: string; entreprise?: string }) {
    return this.entrepriseService.listerOffresEmploi(utilisateur);
  }

  @ApiOperation({ summary: 'Publie une offre d emploi' })
  @Post('offres-emploi')
  async creerOffreEmploi(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Body() donnees: CreateOffreEmploiDto,
  ) {
    return this.entrepriseService.creerOffreEmploi(utilisateur, donnees);
  }

  @ApiOperation({ summary: 'Met a jour une offre d emploi existante' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre d emploi' })
  @Patch('offres-emploi/:id')
  async modifierOffreEmploi(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Param('id') id: string,
    @Body() donnees: UpdateOffreEmploiDto,
  ) {
    return this.entrepriseService.modifierOffreEmploi(utilisateur, id, donnees);
  }

  @ApiOperation({ summary: 'Archive une offre d emploi de l entreprise' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre d emploi' })
  @Patch('offres-emploi/:id/archive')
  async archiverOffreEmploi(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Param('id') id: string,
  ) {
    return this.entrepriseService.archiverOffreEmploi(utilisateur, id);
  }

  @ApiOperation({ summary: 'Retourne le tableau de bord de l entreprise connectee' })
  @Get('tableau-de-bord')
  async getTableauDeBord(@CurrentUser() utilisateur: { id: string; email: string; entreprise?: string }) {
    return this.entrepriseService.getTableauDeBord(utilisateur);
  }

  @ApiOperation({ summary: 'Retourne les statistiques detaillees de l entreprise connectee' })
  @Get('stats')
  async getStats(@CurrentUser() utilisateur: { id: string; email: string; entreprise?: string }) {
    return this.entrepriseService.getStats(utilisateur);
  }

  @ApiOperation({ summary: 'Liste les candidatures recues pour les offres de l entreprise' })
  @Get('candidatures')
  async listerCandidatures(@CurrentUser() utilisateur: { id: string; email: string; entreprise?: string }) {
    return this.entrepriseService.listerCandidatures(utilisateur);
  }

  @ApiOperation({ summary: 'Change le statut d une candidature' })
  @ApiParam({ name: 'id', description: 'Identifiant de la candidature' })
  @Patch('candidatures/:id/statut')
  async changerStatutCandidature(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Param('id') candidatureId: string,
    @Body() donnees: ChangerStatutCandidatureDto,
  ) {
    return this.entrepriseService.changerStatutCandidature(utilisateur, candidatureId, donnees);
  }

  @ApiOperation({ summary: 'Liste les entretiens planifies par l entreprise' })
  @Get('entretiens')
  async listerEntretiens(@CurrentUser() utilisateur: { id: string; email: string; entreprise?: string }) {
    return this.entrepriseService.listerEntretiens(utilisateur);
  }

  @ApiOperation({ summary: 'Planifie un entretien pour une candidature' })
  @Post('entretiens')
  async planifierEntretien(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Body() donnees: PlanifierEntretienDto,
  ) {
    return this.entrepriseService.planifierEntretien(utilisateur, donnees);
  }

  @ApiOperation({ summary: 'Soumet une evaluation croisee sur un stagiaire' })
  @Post('evaluations')
  async soumettreEvaluation(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Body() donnees: SoumettreEvaluationDto,
  ) {
    return this.entrepriseService.soumettreEvaluation(utilisateur, donnees);
  }

  @ApiOperation({ summary: 'Change le statut d un entretien' })
  @ApiParam({ name: 'id', description: 'Identifiant de l entretien' })
  @Patch('entretiens/:id/statut')
  async changerStatutEntretien(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
    @Param('id') entretienId: string,
    @Body() donnees: ChangerStatutEntretienDto,
  ) {
    return this.entrepriseService.changerStatutEntretien(utilisateur, entretienId, donnees);
  }

  @ApiOperation({ summary: 'Statistiques détaillées de l entreprise' })
  @Get('statistiques')
  async getStatistiques(
    @CurrentUser() utilisateur: { id: string; email: string; entreprise?: string },
  ) {
    return this.entrepriseService.getStatistiques(utilisateur);
  }
}
