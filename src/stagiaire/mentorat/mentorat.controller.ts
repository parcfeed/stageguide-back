import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreerDemandeMentoratDto } from './dto/creer-demande-mentorat.dto';
import { CreerObjectifDto } from './dto/creer-objectif.dto';
import { ModifierObjectifDto } from './dto/modifier-objectif.dto';
import { MentoratStagiaireService } from './mentorat.service';

@ApiTags('stagiaire')
@ApiBearerAuth()
@Controller('stagiaire/mentorat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class MentoratStagiaireController {
  constructor(private readonly mentoratService: MentoratStagiaireService) {}

  @ApiOperation({ summary: 'Vue d ensemble du mentorat du stagiaire' })
  @Get('demandes')
  async listerDemandes(@CurrentUser() utilisateur: { id: string }) {
    return this.mentoratService.listerDemandes(utilisateur.id);
  }

  @ApiOperation({ summary: 'Cree une demande de mentorat' })
  @Post('demandes')
  async creerDemande(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: CreerDemandeMentoratDto,
  ) {
    return this.mentoratService.creerDemande(utilisateur.id, donnees);
  }

  // ─── Objectifs ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Liste les objectifs de mentorat du stagiaire' })
  @Get('objectifs')
  async listerObjectifs(@CurrentUser() utilisateur: { id: string }) {
    return this.mentoratService.listerObjectifs(utilisateur.id);
  }

  @ApiOperation({ summary: 'Cree un objectif de mentorat' })
  @Post('objectifs')
  async creerObjectif(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: CreerObjectifDto,
  ) {
    return this.mentoratService.creerObjectif(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Met a jour un objectif de mentorat' })
  @ApiParam({ name: 'id', description: 'Identifiant de l objectif' })
  @Patch('objectifs/:id')
  async modifierObjectif(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') objectifId: string,
    @Body() donnees: ModifierObjectifDto,
  ) {
    return this.mentoratService.modifierObjectif(utilisateur.id, objectifId, donnees);
  }

  @ApiOperation({ summary: 'Supprime un objectif de mentorat' })
  @ApiParam({ name: 'id', description: 'Identifiant de l objectif' })
  @Delete('objectifs/:id')
  async supprimerObjectif(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') objectifId: string,
  ) {
    return this.mentoratService.supprimerObjectif(utilisateur.id, objectifId);
  }
}
