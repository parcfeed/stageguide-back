import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { CandidaturesService } from './candidatures.service';
import { CreerCandidatureDto } from './dto/creer-candidature.dto';

@ApiTags('stagiaire')
@ApiBearerAuth()
@Controller('stagiaire/candidatures')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class CandidaturesController {
  constructor(private readonly candidaturesService: CandidaturesService) {}

  @ApiOperation({ summary: 'Liste les candidatures du stagiaire' })
  @Get()
  async lister(@CurrentUser() utilisateur: { id: string }) {
    return this.candidaturesService.lister(utilisateur.id);
  }

  @ApiOperation({ summary: 'Cree une candidature' })
  @Post()
  async creer(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: CreerCandidatureDto,
  ) {
    return this.candidaturesService.creer(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Annule une candidature' })
  @ApiParam({ name: 'id', description: 'Identifiant de la candidature' })
  @Patch(':id/annuler')
  async annuler(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') candidatureId: string,
  ) {
    return this.candidaturesService.annuler(utilisateur.id, candidatureId);
  }
}
