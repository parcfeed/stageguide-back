import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DemandeConnexionDto } from './dto/demande-connexion.dto';
import { RepondreConnexionDto } from './dto/repondre-connexion.dto';
import { ReseauService } from './reseau.service';

@ApiTags('reseau')
@ApiBearerAuth()
@Controller('reseau')
@UseGuards(JwtAuthGuard)
export class ReseauController {
  constructor(private readonly reseauService: ReseauService) {}

  @ApiOperation({ summary: 'Recherche et liste les membres de la communauté' })
  @ApiQuery({ name: 'recherche', required: false, description: 'Mot-clé de recherche' })
  @ApiQuery({ name: 'role', required: false, description: 'Filtrer par rôle utilisateur' })
  @Get('membres')
  async listerMembres(
    @Query('recherche') recherche?: string,
    @Query('role') role?: string,
  ) {
    return this.reseauService.listerMembres(recherche, role);
  }

  @ApiOperation({ summary: 'Suggère des profils pertinents à ajouter à son réseau' })
  @Get('suggestions')
  async getSuggestions(@CurrentUser() utilisateur: { id: string }) {
    return this.reseauService.getSuggestions(utilisateur.id);
  }

  @ApiOperation({ summary: 'Liste les connexions de l utilisateur (actives et demandes)' })
  @Get('connexions')
  async listerConnexions(@CurrentUser() utilisateur: { id: string }) {
    return this.reseauService.listerConnexions(utilisateur.id);
  }

  @ApiOperation({ summary: 'Envoie une demande de connexion à un membre' })
  @Post('connexions')
  async demanderConnexion(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: DemandeConnexionDto,
  ) {
    return this.reseauService.demanderConnexion(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Accepte ou refuse une demande de connexion reçue' })
  @ApiParam({ name: 'id', description: 'Identifiant de la relation de connexion' })
  @Patch('connexions/:id')
  async repondreConnexion(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') connexionId: string,
    @Body() donnees: RepondreConnexionDto,
  ) {
    return this.reseauService.repondreConnexion(utilisateur.id, connexionId, donnees);
  }
}
