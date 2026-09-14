import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { TableauDeBordService } from './tableau-de-bord.service';

@ApiTags('stagiaire')
@ApiBearerAuth()
@Controller('stagiaire/tableau-de-bord')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class TableauDeBordController {
  constructor(private readonly tableauDeBordService: TableauDeBordService) {}

  @ApiOperation({ summary: 'Recupere la vue d ensemble du tableau de bord stagiaire' })
  @ApiResponse({ status: 200, description: 'Tableau de bord retourne avec succes' })
  @Get()
  async getVueEnsemble(@CurrentUser() utilisateur: { id: string }) {
    return this.tableauDeBordService.getVueEnsemble(utilisateur.id);
  }

  @ApiOperation({ summary: 'Recupere le calendrier collaboratif du stagiaire' })
  @ApiResponse({ status: 200, description: 'Calendrier retourne avec succes' })
  @Get('calendrier')
  async getCalendrier(@CurrentUser() utilisateur: { id: string }) {
    return this.tableauDeBordService.getCalendrier(utilisateur.id);
  }
}
