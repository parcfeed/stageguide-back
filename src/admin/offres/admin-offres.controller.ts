import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { AdminOffresService } from './admin-offres.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/offres')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOffresController {
  constructor(private readonly adminOffresService: AdminOffresService) {}

  @ApiOperation({ summary: 'Liste toutes les offres de stage et d emploi pour modération' })
  @ApiQuery({ name: 'type', required: false, enum: ['stage', 'emploi'] })
  @ApiQuery({ name: 'search', required: false })
  @Get()
  async listerOffres(
    @Query('type') type?: 'stage' | 'emploi',
    @Query('search') search?: string,
  ) {
    return this.adminOffresService.listerOffres({ type, search });
  }

  @ApiOperation({ summary: 'Valide et publie une offre de stage' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre de stage' })
  @Patch('stage/:id/valider')
  async validerOffreStage(@Param('id') id: string) {
    return this.adminOffresService.modererOffreStage(id, 'valider');
  }

  @ApiOperation({ summary: 'Archive ou masque une offre de stage' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre de stage' })
  @Patch('stage/:id/archiver')
  async archiverOffreStage(@Param('id') id: string) {
    return this.adminOffresService.modererOffreStage(id, 'archiver');
  }

  @ApiOperation({ summary: 'Supprime définitivement une offre de stage' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre de stage' })
  @Delete('stage/:id')
  async supprimerOffreStage(@Param('id') id: string) {
    return this.adminOffresService.supprimerOffreStage(id);
  }

  @ApiOperation({ summary: 'Valide et publie une offre d emploi' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre d emploi' })
  @Patch('emploi/:id/valider')
  async validerOffreEmploi(@Param('id') id: string) {
    return this.adminOffresService.modererOffreEmploi(id, 'valider');
  }

  @ApiOperation({ summary: 'Archive ou masque une offre d emploi' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre d emploi' })
  @Patch('emploi/:id/archiver')
  async archiverOffreEmploi(@Param('id') id: string) {
    return this.adminOffresService.modererOffreEmploi(id, 'archiver');
  }

  @ApiOperation({ summary: 'Supprime définitivement une offre d emploi' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre d emploi' })
  @Delete('emploi/:id')
  async supprimerOffreEmploi(@Param('id') id: string) {
    return this.adminOffresService.supprimerOffreEmploi(id);
  }
}
