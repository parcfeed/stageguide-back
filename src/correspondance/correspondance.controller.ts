import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { CorrespondanceService } from './correspondance.service';
import { FiltrerCorrespondanceDto } from './dto/filtrer-correspondance.dto';

@ApiTags('correspondance')
@ApiBearerAuth()
@Controller('correspondance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class CorrespondanceController {
  constructor(private readonly correspondanceService: CorrespondanceService) {}

  @ApiOperation({ summary: 'Propose des mentors pertinents au stagiaire' })
  @Get('mentors')
  async proposerMentors(
    @CurrentUser() utilisateur: { id: string },
    @Query() filtres: FiltrerCorrespondanceDto,
  ) {
    return this.correspondanceService.proposerMentors(utilisateur.id, filtres);
  }
}
