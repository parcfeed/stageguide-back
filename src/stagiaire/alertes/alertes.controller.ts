import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreerAlerteDto } from './dto/creer-alerte.dto';
import { AlertesService } from './alertes.service';

@ApiTags('stagiaire')
@ApiBearerAuth()
@Controller('stagiaire/alertes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class AlertesController {
  constructor(private readonly alertesService: AlertesService) {}

  @ApiOperation({ summary: 'Liste les alertes de recherche du stagiaire' })
  @Get()
  async lister(@CurrentUser() utilisateur: { id: string }) {
    return this.alertesService.lister(utilisateur.id);
  }

  @ApiOperation({ summary: 'Crée une alerte de recherche pour un stagiaire' })
  @Post()
  async creer(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: CreerAlerteDto,
  ) {
    return this.alertesService.creer(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Supprime une alerte' })
  @ApiParam({ name: 'id', description: 'Identifiant de l alerte' })
  @Delete(':id')
  async supprimer(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') alerteId: string,
  ) {
    return this.alertesService.supprimer(utilisateur.id, alerteId);
  }
}
