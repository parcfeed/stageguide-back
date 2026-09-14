import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { SauvegarderOffreDto } from './dto/sauvegarder-offre.dto';
import { OffresSauvegardeesService } from './offres-sauvegardees.service';

@ApiTags('opportunites')
@ApiBearerAuth()
@Controller('opportunites/offres-sauvegardees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class OffresSauvegardeesController {
  constructor(private readonly offresSauvegardeesService: OffresSauvegardeesService) {}

  @ApiOperation({ summary: 'Liste les offres sauvegardees par le stagiaire' })
  @Get()
  async lister(@CurrentUser() utilisateur: { id: string }) {
    return this.offresSauvegardeesService.lister(utilisateur.id);
  }

  @ApiOperation({ summary: 'Sauvegarde une offre de stage ou d emploi' })
  @Post()
  async sauvegarder(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: SauvegarderOffreDto,
  ) {
    return this.offresSauvegardeesService.sauvegarder(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Supprime une offre sauvegardee' })
  @ApiParam({ name: 'id', description: 'Identifiant de la sauvegarde' })
  @Delete(':id')
  async supprimer(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') sauvegardeId: string,
  ) {
    return this.offresSauvegardeesService.supprimer(utilisateur.id, sauvegardeId);
  }
}
