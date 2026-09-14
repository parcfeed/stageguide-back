import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListerOffresStageDto } from './dto/lister-offres-stage.dto';

@Injectable()
export class OffresStageService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(filtres: ListerOffresStageDto) {
    const where: any = {
      isArchived: false,
    };

    if (filtres.search) {
      where.OR = [
        { titre: { contains: filtres.search, mode: 'insensitive' } },
        { description: { contains: filtres.search, mode: 'insensitive' } },
        { domaine: { contains: filtres.search, mode: 'insensitive' } },
      ];
    }

    if (filtres.ville) {
      where.ville = { contains: filtres.ville, mode: 'insensitive' };
    }

    if (filtres.domaine) {
      where.domaine = { contains: filtres.domaine, mode: 'insensitive' };
    }

    if (filtres.remote !== undefined) {
      where.remote = filtres.remote;
    }

    const offres = await this.prisma.offreStage.findMany({
      where,
      include: {
        partenaire: {
          select: {
            id: true,
            nomEntreprise: true,
            ville: true,
            email: true,
            lienSiteWeb: true,
          },
        },
      },
      orderBy: { datePublication: 'desc' },
    });

    return { filtres, offres };
  }

  async getById(id: string) {
    const offre = await this.prisma.offreStage.findFirst({
      where: { id, isArchived: false },
      include: {
        partenaire: {
          select: {
            id: true,
            nomEntreprise: true,
            ville: true,
            email: true,
            lienSiteWeb: true,
          },
        },
        _count: {
          select: { candidatures: true },
        },
      },
    });

    if (!offre) {
      throw new NotFoundException('Offre de stage introuvable');
    }

    return offre;
  }

  async getRecommendations(utilisateurId: string) {
    const utilisateur = await this.prisma.user.findUnique({
      where: { id: utilisateurId },
      include: {
        competences: {
          include: { competence: true },
        },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const competences = new Set(
      utilisateur.competences
        .map((item) => item.competence?.nom)
        .filter((nom): nom is string => !!nom)
        .map((nom) => nom.toLowerCase()),
    );

    const offres = await this.prisma.offreStage.findMany({
      where: { isArchived: false },
      include: {
        partenaire: {
          select: {
            id: true,
            nomEntreprise: true,
            ville: true,
          },
        },
      },
      orderBy: { datePublication: 'desc' },
    });

    const recommandations = offres
      .map((offre) => {
        let score = 20;
        const matchReasons: string[] = [];

        const description = `${offre.titre} ${offre.description} ${offre.domaine ?? ''}`.toLowerCase();
        const matchingSkills = [...competences].filter((competence) => description.includes(competence));

        if (matchingSkills.length > 0) {
          score += Math.min(45, matchingSkills.length * 15);
          matchReasons.push(`Compétences alignées : ${matchingSkills.slice(0, 3).join(', ')}`);
        }

        if (offre.domaine && utilisateur.ecole) {
          score += 10;
          matchReasons.push(`Domaine cohérent avec votre formation`);
        }

        if (offre.ville) {
          score += 10;
          matchReasons.push(`Ville compatible : ${offre.ville}`);
        }

        if (offre.remote) {
          score += 5;
          matchReasons.push('Offre en télétravail');
        }

        return {
          ...offre,
          score: Math.min(99, Math.max(0, score)),
          matchReasons: matchReasons.length > 0 ? matchReasons : ['Profil globalement compatible'],
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      utilisateurId,
      total: recommandations.length,
      offres: recommandations,
    };
  }
}

