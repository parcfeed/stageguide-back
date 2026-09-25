import { Controller, Get, Param, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { CvService } from './cv.service';

@ApiTags('stagiaire')
@Controller('stagiaire/cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAGIAIRE)
  @ApiOperation({ summary: 'Génère le CV structuré du stagiaire' })
  @Get()
  async getCv(@CurrentUser() utilisateur: { id: string }) {
    return this.cvService.getCv(utilisateur.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAGIAIRE, UserRole.MENTOR, UserRole.ENTREPRISE)
  @ApiOperation({ summary: 'Récupère le CV d un stagiaire cible selon son identifiant' })
  @Get(':utilisateurId')
  async getCvByUserId(@Param('utilisateurId') utilisateurId: string) {
    return this.cvService.getCv(utilisateurId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAGIAIRE)
  @ApiOperation({ summary: 'Télécharge le PDF du CV' })
  @Get('pdf')
  async getPdf(@CurrentUser() utilisateur: { id: string }): Promise<StreamableFile> {
    return this.cvService.getPdf(utilisateur.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAGIAIRE, UserRole.MENTOR, UserRole.ENTREPRISE)
  @ApiOperation({ summary: 'Télécharge le PDF du CV d un stagiaire cible' })
  @Get(':utilisateurId/pdf')
  async getPdfByUserId(
    @CurrentUser() utilisateur: { id: string },
    @Param('utilisateurId') utilisateurId: string,
  ): Promise<StreamableFile> {
    void utilisateur;
    return this.cvService.getPdf(utilisateurId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAGIAIRE)
  @ApiOperation({ summary: 'Crée un lien de partage public sécurisé du CV' })
  @Get('partage')
  async createShareToken(@CurrentUser() utilisateur: { id: string }) {
    const token = this.cvService.createShareToken(utilisateur.id);
    const publicUrl = this.cvService.buildPublicUrl(token);

    return {
      token,
      lienPublic: publicUrl,
      publicUrl,
      url: publicUrl,
      link: publicUrl,
      message: 'Token de partage créé avec succès',
    };
  }

  @ApiOperation({ summary: 'Récupère le CV partagé publiquement via un token sécurisé' })
  @ApiParam({ name: 'token', description: 'Token temporaire de partage publique du CV' })
  @Get('partage/:token')
  async getSharedCv(@Param('token') token: string) {
    return this.cvService.getSharedCvByToken(token);
  }
}
