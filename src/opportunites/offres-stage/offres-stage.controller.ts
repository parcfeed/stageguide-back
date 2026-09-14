import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { ListerOffresStageDto } from './dto/lister-offres-stage.dto';
import { OffresStageService } from './offres-stage.service';

@ApiTags('opportunites')
@Controller('opportunites/offres-stage')
export class OffresStageController {
  constructor(private readonly offresStageService: OffresStageService) {}

  @ApiOperation({ summary: 'Liste les offres de stage' })
  @Get()
  async lister(@Query() filtres: ListerOffresStageDto) {
    return this.offresStageService.lister(filtres);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAGIAIRE)
  @ApiOperation({ summary: 'Recommande des offres de stage selon le profil stagiaire' })
  @Get('recommandations')
  async recommandations(@CurrentUser() utilisateur: { id: string }) {
    return this.offresStageService.getRecommendations(utilisateur.id);
  }

  @ApiOperation({ summary: 'Recupere le detail d une offre de stage' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre de stage' })
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.offresStageService.getById(id);
  }
}
