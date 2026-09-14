import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { StagiairesService } from './stagiaires.service';

@ApiTags('mentor')
@ApiBearerAuth()
@Controller('mentor/stagiaires')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MENTOR)
export class StagiairesController {
  constructor(private readonly stagiairesService: StagiairesService) {}

  @ApiOperation({ summary: 'Liste les stagiaires suivis par le mentor' })
  @Get()
  async lister(@CurrentUser() utilisateur: { id: string }) {
    return this.stagiairesService.lister(utilisateur.id);
  }

  @ApiOperation({ summary: 'Vue synthétique du tableau de bord mentor' })
  @Get('tableau-de-bord')
  async getTableauDeBord(@CurrentUser() utilisateur: { id: string }) {
    return this.stagiairesService.getTableauDeBord(utilisateur.id);
  }
}
