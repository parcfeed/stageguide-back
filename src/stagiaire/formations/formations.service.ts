import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FormationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listerCatalogue() {
    const formations = await this.prisma.formation.findMany({
      where: { estActive: true },
      include: {
        modules: {
          orderBy: { ordre: 'asc' },
          select: { id: true, titre: true, ordre: true },
        },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { formations };
  }

  async listerMesFormations(utilisateurId: string) {
    const inscriptions = await this.prisma.inscriptionFormation.findMany({
      where: { utilisateurId },
      include: {
        formation: {
          select: {
            id: true,
            titre: true,
            description: true,
            domaine: true,
            niveau: true,
            dureeHeures: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      utilisateurId,
      inscriptions,
    };
  }

  async sInscrire(utilisateurId: string, formationId: string) {
    const formation = await this.prisma.formation.findFirst({
      where: { id: formationId, estActive: true },
    });

    if (!formation) {
      throw new NotFoundException('Formation introuvable ou inactive');
    }

    const existante = await this.prisma.inscriptionFormation.findUnique({
      where: {
        utilisateurId_formationId: { utilisateurId, formationId },
      },
    });

    if (existante) {
      throw new BadRequestException('Vous êtes déjà inscrit à cette formation');
    }

    const inscription = await this.prisma.inscriptionFormation.create({
      data: {
        utilisateurId,
        formationId,
        progression: 0,
      },
      include: {
        formation: {
          select: {
            id: true,
            titre: true,
            description: true,
            domaine: true,
            niveau: true,
            dureeHeures: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    await this.prisma.notification.create({
      data: {
        utilisateurId,
        titre: 'Inscription confirmée',
        message: `Vous êtes maintenant inscrit à la formation "${formation.titre}".`,
        type: 'FORMATION',
      },
    });

    return {
      id: inscription.id,
      utilisateurId: inscription.utilisateurId,
      formation: inscription.formation,
      progression: inscription.progression,
      createdAt: inscription.createdAt,
      message: 'Inscription à la formation réussie',
    };
  }

  async getProgression(utilisateurId: string, formationId: string) {
    const inscription = await this.prisma.inscriptionFormation.findUnique({
      where: {
        utilisateurId_formationId: { utilisateurId, formationId },
      },
      include: {
        formation: {
          include: {
            modules: true,
          },
        },
      },
    });

    if (!inscription) {
      throw new NotFoundException('Inscription à la formation introuvable');
    }

    const totalModules = inscription.formation.modules.length;
    const pourcentage = totalModules > 0 ? Math.round((inscription.progression / 100) * 100) : 0;
    const statut = pourcentage >= 100 ? 'TERMINE' : pourcentage > 0 ? 'EN_COURS' : 'NON_COMMENCE';

    return {
      utilisateurId,
      formationId,
      progression: inscription.progression,
      pourcentage,
      statut,
      totalModules,
      completedAt: inscription.completedAt,
    };
  }

  async updateProgression(
    utilisateurId: string,
    formationId: string,
    donnees: { progression?: number },
  ) {
    const inscription = await this.prisma.inscriptionFormation.findUnique({
      where: {
        utilisateurId_formationId: { utilisateurId, formationId },
      },
      include: {
        formation: {
          include: {
            modules: true,
          },
        },
      },
    });

    if (!inscription) {
      throw new NotFoundException('Inscription à la formation introuvable');
    }

    const progression = Math.max(0, Math.min(100, donnees.progression ?? inscription.progression));
    const statut = progression >= 100 ? 'TERMINE' : progression > 0 ? 'EN_COURS' : 'NON_COMMENCE';

    const updated = await this.prisma.inscriptionFormation.update({
      where: { id: inscription.id },
      data: {
        progression,
        completedAt: progression >= 100 ? new Date() : null,
      },
    });

    await this.prisma.notification.create({
      data: {
        utilisateurId,
        titre: 'Progression de formation',
        message: `Votre progression sur la formation "${inscription.formation.titre}" est à ${progression}% .`,
        type: 'FORMATION',
      },
    });

    return {
      id: updated.id,
      utilisateurId: updated.utilisateurId,
      formationId: updated.formationId,
      progression: updated.progression,
      pourcentage: updated.progression,
      statut,
      completedAt: updated.completedAt,
      message: 'Progression mise à jour avec succès',
    };
  }

  async listerForum(formationId: string) {
    const formation = await this.prisma.formation.findUnique({ where: { id: formationId } });
    if (!formation) {
      throw new NotFoundException('Formation introuvable');
    }

    const sujets = await this.prisma.sujetForum.findMany({
      where: { formationId },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, role: true } },
        reponses: {
          include: {
            auteur: { select: { id: true, prenom: true, nom: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      formationId,
      total: sujets.length,
      sujets: sujets.map((s) => ({
        id: s.id,
        titre: s.titre,
        contenu: s.contenu,
        createdAt: s.createdAt,
        auteur: s.auteur,
        totalReponses: s.reponses.length,
        reponses: s.reponses,
      })),
    };
  }

  async creerSujetForum(
    utilisateurId: string,
    formationId: string,
    donnees: { titre: string; contenu: string },
  ) {
    const formation = await this.prisma.formation.findUnique({ where: { id: formationId } });
    if (!formation) {
      throw new NotFoundException('Formation introuvable');
    }

    const sujet = await this.prisma.sujetForum.create({
      data: {
        formationId,
        auteurId: utilisateurId,
        titre: donnees.titre,
        contenu: donnees.contenu,
      },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, role: true } },
      },
    });

    return {
      ...sujet,
      message: 'Sujet de discussion créé avec succès',
    };
  }

  async repondreSujetForum(
    utilisateurId: string,
    formationId: string,
    sujetId: string,
    donnees: { contenu: string },
  ) {
    const sujet = await this.prisma.sujetForum.findFirst({
      where: { id: sujetId, formationId },
    });

    if (!sujet) {
      throw new NotFoundException('Sujet de discussion introuvable');
    }

    const reponse = await this.prisma.reponseForum.create({
      data: {
        sujetId,
        auteurId: utilisateurId,
        contenu: donnees.contenu,
      },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, role: true } },
      },
    });

    if (sujet.auteurId !== utilisateurId) {
      await this.prisma.notification.create({
        data: {
          utilisateurId: sujet.auteurId,
          titre: 'Nouvelle réponse à votre question',
          message: `Quelqu'un a répondu à votre sujet "${sujet.titre}".`,
          type: 'FORUM',
        },
      });
    }

    return {
      ...reponse,
      message: 'Réponse ajoutée avec succès',
    };
  }
}
