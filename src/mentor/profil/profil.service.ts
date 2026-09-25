import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModifierProfilMentorDto } from './dto/modifier-profil-mentor.dto';

@Injectable()
export class ProfilMentorService {
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
        entreprise: true,
        poste: true,
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
      entreprise: utilisateur.entreprise,
      poste: utilisateur.poste,
      bio: utilisateur.bio,
      role: utilisateur.role,
    };
  }

  async getProfilById(utilisateurId: string) {
    return this.getProfil(utilisateurId);
  }

  async modifierProfil(utilisateurId: string, modification: ModifierProfilMentorDto) {
    const utilisateur = await this.prisma.user.update({
      where: { id: utilisateurId },
      data: {
        telephone: modification.telephone,
        entreprise: modification.entreprise,
        poste: modification.poste,
        bio: modification.bio,
      },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        telephone: true,
        entreprise: true,
        poste: true,
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
      entreprise: utilisateur.entreprise,
      poste: utilisateur.poste,
      bio: utilisateur.bio,
      role: utilisateur.role,
      message: 'Profil mentor mis a jour avec succes',
    };
  }
}
