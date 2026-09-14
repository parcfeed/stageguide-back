import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { MettreAJourProgressionDto } from './dto/mettre-a-jour-progression.dto';
import { FormationsService } from './formations.service';

@ApiTags('stagiaire')
@ApiBearerAuth()
@Controller('stagiaire/formations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @ApiOperation({ summary: 'Liste le catalogue des formations disponibles' })
  @Get()
  async listerCatalogue() {
    return this.formationsService.listerCatalogue();
  }

  @ApiOperation({ summary: 'Liste les formations du stagiaire' })
  @Get('mes-formations')
  async listerMesFormations(@CurrentUser() utilisateur: { id: string }) {
    return this.formationsService.listerMesFormations(utilisateur.id);
  }

  @ApiOperation({ summary: 'S inscrire a une formation' })
  @ApiParam({ name: 'id', description: 'Identifiant de la formation' })
  @Post(':id/inscription')
  async sInscrire(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') formationId: string,
  ) {
    return this.formationsService.sInscrire(utilisateur.id, formationId);
  }

  @ApiOperation({ summary: 'Consulte la progression d une formation' })
  @ApiParam({ name: 'id', description: 'Identifiant de la formation' })
  @Get(':id/progression')
  async getProgression(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') formationId: string,
  ) {
    return this.formationsService.getProgression(utilisateur.id, formationId);
  }

  @ApiOperation({ summary: 'Met a jour la progression d une formation' })
  @ApiParam({ name: 'id', description: 'Identifiant de la formation' })
  @Patch(':id/progression')
  async updateProgression(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') formationId: string,
    @Body() donnees: MettreAJourProgressionDto,
  ) {
    return this.formationsService.updateProgression(utilisateur.id, formationId, donnees);
  }

  @ApiOperation({ summary: 'Liste les sujets de discussion du forum d une formation' })
  @ApiParam({ name: 'id', description: 'Identifiant de la formation' })
  @Get(':id/forum')
  async listerForum(@Param('id') formationId: string) {
    return this.formationsService.listerForum(formationId);
  }

  @ApiOperation({ summary: 'Crée un sujet de discussion sur le forum d une formation' })
  @ApiParam({ name: 'id', description: 'Identifiant de la formation' })
  @Post(':id/forum')
  async creerSujetForum(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') formationId: string,
    @Body() donnees: { titre: string; contenu: string },
  ) {
    return this.formationsService.creerSujetForum(utilisateur.id, formationId, donnees);
  }

  @ApiOperation({ summary: 'Répond à un sujet de discussion sur le forum' })
  @ApiParam({ name: 'id', description: 'Identifiant de la formation' })
  @ApiParam({ name: 'sujetId', description: 'Identifiant du sujet' })
  @Post(':id/forum/:sujetId/reponses')
  async repondreSujetForum(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') formationId: string,
    @Param('sujetId') sujetId: string,
    @Body() donnees: { contenu: string },
  ) {
    return this.formationsService.repondreSujetForum(utilisateur.id, formationId, sujetId, donnees);
  }
}
