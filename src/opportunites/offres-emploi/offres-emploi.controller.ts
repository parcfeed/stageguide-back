import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ListerOffresEmploiDto } from './dto/lister-offres-emploi.dto';
import { OffresEmploiService } from './offres-emploi.service';

@ApiTags('opportunites')
@Controller('opportunites/offres-emploi')
export class OffresEmploiController {
  constructor(private readonly offresEmploiService: OffresEmploiService) {}

  @ApiOperation({ summary: 'Liste les offres d emploi' })
  @Get()
  async lister(@Query() filtres: ListerOffresEmploiDto) {
    return this.offresEmploiService.lister(filtres);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Recommande des offres d emploi selon le profil' })
  @Get('recommandations')
  async recommandations(@CurrentUser() utilisateur: { id: string }) {
    return this.offresEmploiService.getRecommendations(utilisateur.id);
  }

  @ApiOperation({ summary: 'Recupere le detail d une offre d emploi' })
  @ApiParam({ name: 'id', description: 'Identifiant de l offre d emploi' })
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.offresEmploiService.getById(id);
  }
}
