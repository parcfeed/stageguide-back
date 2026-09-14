import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { CertificatsService } from './certificats.service';
import { GenererCertificatDto } from './dto/generer-certificat.dto';

@ApiTags('stagiaire')
@ApiBearerAuth()
@Controller('stagiaire/certificats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAGIAIRE)
export class CertificatsController {
  constructor(private readonly certificatsService: CertificatsService) {}

  @ApiOperation({ summary: 'Liste les certificats du stagiaire' })
  @Get()
  async lister(@CurrentUser() utilisateur: { id: string }) {
    return this.certificatsService.lister(utilisateur.id);
  }

  @ApiOperation({ summary: 'Genere un nouveau certificat pour le stagiaire' })
  @Post()
  async generer(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: GenererCertificatDto,
  ) {
    return this.certificatsService.generer(utilisateur.id, donnees);
  }
}
