import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      usersByRole,
      activeUsers,
      totalOffresStage,
      archivedOffresStage,
      totalOffresEmploi,
      archivedOffresEmploi,
      totalCandidatures,
      candidaturesByStatus,
      totalConventions,
      conventionsByStatus,
      totalFormations,
      totalInscriptions,
      totalDemandesMentorat,
      demandesMentoratByStatus,
      totalSessionsMentorat,
      totalCertificats,
      validationQueue,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.offreStage.count(),
      this.prisma.offreStage.count({ where: { isArchived: true } }),
      this.prisma.offreEmploi.count(),
      this.prisma.offreEmploi.count({ where: { isArchived: true } }),
      this.prisma.candidature.count(),
      this.prisma.candidature.groupBy({
        by: ['statut'],
        _count: { id: true },
      }),
      this.prisma.convention.count(),
      this.prisma.convention.groupBy({
        by: ['statut'],
        _count: { id: true },
      }),
      this.prisma.formation.count(),
      this.prisma.inscriptionFormation.count(),
      this.prisma.demandeMentorat.count(),
      this.prisma.demandeMentorat.groupBy({
        by: ['statut'],
        _count: { id: true },
      }),
      this.prisma.sessionMentorat.count(),
      this.prisma.certificat.count(),
      this.getValidationQueue(),
    ]);

    const roleMap: Record<string, number> = {};
    for (const r of usersByRole) {
      roleMap[r.role] = r._count.id;
    }

    const candidatureStatusMap: Record<string, number> = {};
    for (const c of candidaturesByStatus) {
      candidatureStatusMap[c.statut] = c._count.id;
    }

    const conventionStatusMap: Record<string, number> = {};
    for (const c of conventionsByStatus) {
      conventionStatusMap[c.statut] = c._count.id;
    }

    const mentoratStatusMap: Record<string, number> = {};
    for (const m of demandesMentoratByStatus) {
      mentoratStatusMap[m.statut] = m._count.id;
    }

    return {
      utilisateurs: {
        total: totalUsers,
        actifs: activeUsers,
        parRole: {
          stagiaires: roleMap['STAGIAIRE'] ?? 0,
          mentors: roleMap['MENTOR'] ?? 0,
          entreprises: roleMap['ENTREPRISE'] ?? 0,
          admins: roleMap['ADMIN'] ?? 0,
          tuteurs: roleMap['TUTEUR'] ?? 0,
        },
      },
      offres: {
        stages: {
          total: totalOffresStage,
          actives: totalOffresStage - archivedOffresStage,
          archivees: archivedOffresStage,
        },
        emplois: {
          total: totalOffresEmploi,
          actives: totalOffresEmploi - archivedOffresEmploi,
          archivees: archivedOffresEmploi,
        },
        total: totalOffresStage + totalOffresEmploi,
      },
      candidatures: {
        total: totalCandidatures,
        parStatut: candidatureStatusMap,
      },
      conventions: {
        total: totalConventions,
        parStatut: conventionStatusMap,
      },
      formations: {
        totalFormations,
        totalInscriptions,
      },
      mentorat: {
        totalDemandes: totalDemandesMentorat,
        demandesParStatut: mentoratStatusMap,
        totalSessions: totalSessionsMentorat,
      },
      certificats: {
        total: totalCertificats,
      },
      validationQueue,
    };
  }

  async getValidationQueue() {
    const [stages, emplois] = await Promise.all([
      this.prisma.offreStage.findMany({
        where: { isArchived: false },
        orderBy: { datePublication: 'desc' },
        take: 10,
        include: {
          partenaire: {
            select: { id: true, nomEntreprise: true, ville: true, email: true },
          },
        },
      }),
      this.prisma.offreEmploi.findMany({
        where: { isArchived: false },
        orderBy: { datePublication: 'desc' },
        take: 10,
        include: {
          partenaire: {
            select: { id: true, nomEntreprise: true, ville: true, email: true },
          },
        },
      }),
    ]);

    return {
      stages: stages.map((offre) => ({
        id: offre.id,
        type: 'STAGE',
        titre: offre.titre,
        entreprise: offre.partenaire?.nomEntreprise ?? 'Entreprise inconnue',
        ville: offre.ville,
        datePublication: offre.datePublication,
      })),
      emplois: emplois.map((offre) => ({
        id: offre.id,
        type: 'EMPLOI',
        titre: offre.titre,
        entreprise: offre.partenaire?.nomEntreprise ?? 'Entreprise inconnue',
        ville: offre.ville,
        datePublication: offre.datePublication,
      })),
      total: stages.length + emplois.length,
    };
  }

  async validerOffre(type: 'stage' | 'emploi', offreId: string, decision: 'APPROUVE' | 'REFUSE') {
    if (type !== 'stage' && type !== 'emploi') {
      throw new NotFoundException('Type d offre invalide');
    }

    const isApproval = decision === 'APPROUVE';

    const offre =
      type === 'stage'
        ? await this.prisma.offreStage.findUnique({
            where: { id: offreId },
            include: { partenaire: { select: { id: true, nomEntreprise: true, userId: true } } },
          })
        : await this.prisma.offreEmploi.findUnique({
            where: { id: offreId },
            include: { partenaire: { select: { id: true, nomEntreprise: true, userId: true } } },
          });

    if (!offre) {
      throw new NotFoundException('Offre introuvable');
    }

    const updatedOffre =
      type === 'stage'
        ? await this.prisma.offreStage.update({
            where: { id: offreId },
            data: { isArchived: !isApproval },
          })
        : await this.prisma.offreEmploi.update({
            where: { id: offreId },
            data: { isArchived: !isApproval },
          });

    if (offre.partenaire?.userId) {
      await this.prisma.notification.create({
        data: {
          utilisateurId: offre.partenaire.userId,
          titre: isApproval ? 'Offre validée' : 'Offre refusée',
          message: isApproval
            ? `Votre offre "${offre.titre}" a été approuvée et est désormais visible.`
            : `Votre offre "${offre.titre}" a été refusée et archivée par l'administration.`,
          type: 'OFFRE',
        },
      });
    }

    return {
      id: updatedOffre.id,
      type: type.toUpperCase(),
      statut: decision,
      message: isApproval
        ? `L'offre "${offre.titre}" a été approuvée avec succès.`
        : `L'offre "${offre.titre}" a été refusée et archivée.`,
    };
  }
}
