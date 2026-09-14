import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @ApiOperation({ summary: 'Recupere les statistiques globales pour le tableau de bord admin' })
  @Get()
  async getStats() {
    return this.adminStatsService.getStats();
  }

  @ApiOperation({ summary: 'Recupere la file de validation des offres en attente' })
  @Get('validation')
  async getValidationQueue() {
    return this.adminStatsService.getValidationQueue();
  }

  @ApiOperation({ summary: 'Alias admin pour la file de validation des offres' })
  @Get('offres/validation')
  async getValidationQueueAlias() {
    return this.adminStatsService.getValidationQueue();
  }

  @ApiOperation({ summary: 'Valide ou refuse une offre soumise par une entreprise' })
  @ApiParam({ name: 'type', description: 'Type d offre: stage ou emploi' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre' })
  @Patch('offres/:type/:id/validation')
  async validerOffre(
    @Param('type') type: 'stage' | 'emploi',
    @Param('id') offreId: string,
    @Body() donnees: { decision: 'APPROUVE' | 'REFUSE' },
  ) {
    return this.adminStatsService.validerOffre(type, offreId, donnees.decision);
  }
}
