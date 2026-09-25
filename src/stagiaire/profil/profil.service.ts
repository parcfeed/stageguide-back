import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModifierProfilStagiaireDto } from './dto/modifier-profil-stagiaire.dto';

@Injectable()
export class ProfilStagiaireService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfil(utilisateurId: string) {
    const utilisateur = await this.prisma.user.findFirst({
      where: {
        id: utilisateurId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        telephone: true,
        ecole: true,
        niveauEtudes: true,
        bio: true,
        role: true,
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return {
      utilisateurId: utilisateur.id,
      email: utilisateur.email,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
      telephone: utilisateur.telephone,
      ecole: utilisateur.ecole,
      niveauEtudes: utilisateur.niveauEtudes,
      bio: utilisateur.bio,
      role: utilisateur.role,
    };
  }

  async getProfilById(utilisateurId: string) {
    return this.getProfil(utilisateurId);
  }

  async modifierProfil(
    utilisateurId: string,
    modification: ModifierProfilStagiaireDto,
  ) {
    const utilisateur = await this.prisma.user.update({
      where: { id: utilisateurId },
      data: {
        telephone: modification.telephone,
        ecole: modification.ecole,
        niveauEtudes: modification.niveauEtudes,
        bio: modification.bio,
      },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        telephone: true,
        ecole: true,
        niveauEtudes: true,
        bio: true,
        role: true,
      },
    });

    return {
      utilisateurId: utilisateur.id,
      email: utilisateur.email,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
      telephone: utilisateur.telephone,
      ecole: utilisateur.ecole,
      niveauEtudes: utilisateur.niveauEtudes,
      bio: utilisateur.bio,
      role: utilisateur.role,
      message: 'Profil stagiaire mis a jour avec succes',
    };
  }
}
