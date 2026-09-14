import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListerOffresEmploiDto } from './dto/lister-offres-emploi.dto';

@Injectable()
export class OffresEmploiService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(filtres: ListerOffresEmploiDto) {
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

    const offres = await this.prisma.offreEmploi.findMany({
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
    const offre = await this.prisma.offreEmploi.findFirst({
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
      throw new NotFoundException('Offre d emploi introuvable');
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

    const offres = await this.prisma.offreEmploi.findMany({
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
          matchReasons.push(`Compétences requises : ${matchingSkills.slice(0, 3).join(', ')}`);
        }

        if (offre.domaine && utilisateur.poste) {
          score += 15;
          matchReasons.push(`Aligné avec vos objectifs professionnels`);
        }

        if (offre.ville) {
          score += 10;
          matchReasons.push(`Localisation : ${offre.ville}`);
        }

        if (offre.remote) {
          score += 5;
          matchReasons.push('Poste ouvert au télétravail');
        }

        return {
          ...offre,
          score: Math.min(99, Math.max(0, score)),
          matchReasons: matchReasons.length > 0 ? matchReasons : ['Profil adapté aux critères du poste'],
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
