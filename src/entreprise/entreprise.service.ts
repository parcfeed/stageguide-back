import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOffreStageDto } from './dto/create-offre-stage.dto';
import { UpdateOffreStageDto } from './dto/update-offre-stage.dto';
import { CreateOffreEmploiDto } from './dto/create-offre-emploi.dto';
import { UpdateOffreEmploiDto } from './dto/update-offre-emploi.dto';
import { PlanifierEntretienDto } from './dto/planifier-entretien.dto';
import { ChangerStatutCandidatureDto } from './dto/changer-statut-candidature.dto';
import { ChangerStatutEntretienDto } from './dto/changer-statut-entretien.dto';
import { SoumettreEvaluationDto } from './dto/soumettre-evaluation.dto';

type EntrepriseUser = {
  id: string;
  email: string;
  entreprise?: string | null;
};

@Injectable()
export class EntrepriseService {
  constructor(private readonly prisma: PrismaService) {}

  async listerOffresStage(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartnerOrNull(utilisateur);

    if (!partenaire) {
      return [];
    }

    return this.prisma.offreStage.findMany({
      where: {
        partenaireId: partenaire.id,
        isArchived: false,
      },
      orderBy: { datePublication: 'desc' },
    });
  }

  async creerOffreStage(utilisateur: EntrepriseUser, donnees: CreateOffreStageDto) {
    const partenaire = await this.getOrCreatePartner(utilisateur, donnees.ville);

    const offre = await this.prisma.offreStage.create({
      data: {
        partenaireId: partenaire.id,
        titre: donnees.titre,
        description: donnees.description,
        ville: donnees.ville,
        domaine: donnees.domaine ?? null,
        duree: donnees.duree ?? null,
        remote: donnees.remote ?? false,
        logoUrl: donnees.logoUrl ?? null,
        dateExpiration: donnees.dateExpiration ? new Date(donnees.dateExpiration) : null,
      },
    });

    await this.notifierAbonnesAlertes('STAGE', offre.titre, offre.ville, offre.domaine);

    return offre;
  }

  async modifierOffreStage(utilisateur: EntrepriseUser, id: string, donnees: UpdateOffreStageDto) {
    const offre = await this.findOffreStageOwnedByEntreprise(utilisateur, id);

    return this.prisma.offreStage.update({
      where: { id: offre.id },
      data: {
        titre: donnees.titre ?? offre.titre,
        description: donnees.description ?? offre.description,
        ville: donnees.ville ?? offre.ville,
        domaine: donnees.domaine ?? offre.domaine,
        duree: donnees.duree ?? offre.duree,
        remote: donnees.remote ?? offre.remote,
        logoUrl: donnees.logoUrl ?? offre.logoUrl,
        dateExpiration: donnees.dateExpiration
          ? new Date(donnees.dateExpiration)
          : offre.dateExpiration,
      },
    });
  }

  async archiverOffreStage(utilisateur: EntrepriseUser, id: string) {
    const offre = await this.findOffreStageOwnedByEntreprise(utilisateur, id);

    return this.prisma.offreStage.update({
      where: { id: offre.id },
      data: { isArchived: true },
    });
  }

  async listerOffresEmploi(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartnerOrNull(utilisateur);

    if (!partenaire) {
      return [];
    }

    return this.prisma.offreEmploi.findMany({
      where: {
        partenaireId: partenaire.id,
        isArchived: false,
      },
      orderBy: { datePublication: 'desc' },
    });
  }

  async creerOffreEmploi(utilisateur: EntrepriseUser, donnees: CreateOffreEmploiDto) {
    const partenaire = await this.getOrCreatePartner(utilisateur, donnees.ville);

    const offre = await this.prisma.offreEmploi.create({
      data: {
        partenaireId: partenaire.id,
        titre: donnees.titre,
        description: donnees.description,
        ville: donnees.ville,
        domaine: donnees.domaine ?? null,
        typeContrat: donnees.typeContrat ?? null,
        experience: donnees.experience ?? null,
        remote: donnees.remote ?? false,
        logoUrl: donnees.logoUrl ?? null,
        dateExpiration: donnees.dateExpiration ? new Date(donnees.dateExpiration) : null,
      },
    });

    await this.notifierAbonnesAlertes('EMPLOI', offre.titre, offre.ville, offre.domaine);

    return offre;
  }

  async modifierOffreEmploi(utilisateur: EntrepriseUser, id: string, donnees: UpdateOffreEmploiDto) {
    const offre = await this.findOffreEmploiOwnedByEntreprise(utilisateur, id);

    return this.prisma.offreEmploi.update({
      where: { id: offre.id },
      data: {
        titre: donnees.titre ?? offre.titre,
        description: donnees.description ?? offre.description,
        ville: donnees.ville ?? offre.ville,
        domaine: donnees.domaine ?? offre.domaine,
        typeContrat: donnees.typeContrat ?? offre.typeContrat,
        experience: donnees.experience ?? offre.experience,
        remote: donnees.remote ?? offre.remote,
        logoUrl: donnees.logoUrl ?? offre.logoUrl,
        dateExpiration: donnees.dateExpiration
          ? new Date(donnees.dateExpiration)
          : offre.dateExpiration,
      },
    });
  }

  async archiverOffreEmploi(utilisateur: EntrepriseUser, id: string) {
    const offre = await this.findOffreEmploiOwnedByEntreprise(utilisateur, id);

    return this.prisma.offreEmploi.update({
      where: { id: offre.id },
      data: { isArchived: true },
    });
  }

  async listerCandidatures(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartnerOrNull(utilisateur);

    if (!partenaire) {
      return [];
    }

    return this.prisma.candidature.findMany({
      where: {
        OR: [
          { offreStage: { partenaireId: partenaire.id } },
          { offreEmploi: { partenaireId: partenaire.id } },
        ],
      },
      include: {
        utilisateur: true,
        offreStage: true,
        offreEmploi: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listerEntretiens(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartnerOrNull(utilisateur);

    if (!partenaire) {
      return [];
    }

    return this.prisma.entretien.findMany({
      where: { partenaireId: partenaire.id },
      include: {
        candidature: {
          include: { utilisateur: true, offreStage: true, offreEmploi: true },
        },
        utilisateur: true,
        offreStage: true,
        offreEmploi: true,
      },
      orderBy: { dateProposee: 'desc' },
    });
  }

  async soumettreEvaluation(utilisateur: EntrepriseUser, donnees: SoumettreEvaluationDto) {
    const partenaire = await this.getPartner(utilisateur);

    const candidature = await this.prisma.candidature.findFirst({
      where: {
        utilisateurId: donnees.stagiaireId,
        OR: [
          { offreStage: { partenaireId: partenaire.id } },
          { offreEmploi: { partenaireId: partenaire.id } },
        ],
      },
      include: { offreStage: true, offreEmploi: true },
    });

    if (!candidature) {
      throw new NotFoundException('Aucune candidature validée avec ce stagiaire pour votre entreprise');
    }

    const prisma = this.prisma as any;
    const evaluationExistante = await prisma.evaluationCroisee?.findFirst?.({
      where: {
        partenaireId: partenaire.id,
        stagiaireId: donnees.stagiaireId,
      },
    });

    const evaluation = evaluationExistante
      ? await prisma.evaluationCroisee.update({
          where: { id: evaluationExistante.id },
          data: {
            note: donnees.note,
            commentaire: donnees.commentaire ?? evaluationExistante.commentaire,
          },
        })
      : await prisma.evaluationCroisee.create({
          data: {
            partenaireId: partenaire.id,
            stagiaireId: donnees.stagiaireId,
            candidatureId: candidature.id,
            note: donnees.note,
            commentaire: donnees.commentaire ?? null,
          },
        });

    return {
      ...evaluation,
      message: 'Évaluation transmise avec succès',
    };
  }

  async getTableauDeBord(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartnerOrNull(utilisateur);

    if (!partenaire) {
      return {
        entreprise: null,
        stats: {
          offresStage: { total: 0, actives: 0, archivees: 0 },
          offresEmploi: { total: 0, actives: 0, archivees: 0 },
          candidatures: { total: 0, parStatut: {} },
          entretiens: { total: 0, parStatut: {} },
        },
        offresRecents: {
          stages: [],
          emplois: [],
        },
      };
    }

    const [offresStage, offresEmploi, candidatures, entretiens, totalOffresStage, totalOffresEmploi, candidaturesTotal, entretiensTotal, archivedOffresStage, archivedOffresEmploi] = await Promise.all([
      this.prisma.offreStage.findMany({
        where: { partenaireId: partenaire.id },
        orderBy: { datePublication: 'desc' },
        take: 5,
      }),
      this.prisma.offreEmploi.findMany({
        where: { partenaireId: partenaire.id },
        orderBy: { datePublication: 'desc' },
        take: 5,
      }),
      this.prisma.candidature.groupBy({
        by: ['statut'],
        where: {
          OR: [
            { offreStage: { partenaireId: partenaire.id } },
            { offreEmploi: { partenaireId: partenaire.id } },
          ],
        },
        _count: { id: true },
      }),
      this.prisma.entretien.groupBy({
        by: ['statut'],
        where: { partenaireId: partenaire.id },
        _count: { id: true },
      }),
      this.prisma.offreStage.count({ where: { partenaireId: partenaire.id } }),
      this.prisma.offreEmploi.count({ where: { partenaireId: partenaire.id } }),
      this.prisma.candidature.count({
        where: {
          OR: [
            { offreStage: { partenaireId: partenaire.id } },
            { offreEmploi: { partenaireId: partenaire.id } },
          ],
        },
      }),
      this.prisma.entretien.count({ where: { partenaireId: partenaire.id } }),
      this.prisma.offreStage.count({ where: { partenaireId: partenaire.id, isArchived: true } }),
      this.prisma.offreEmploi.count({ where: { partenaireId: partenaire.id, isArchived: true } }),
    ]);

    const candidaturesParStatut: Record<string, number> = {};
    for (const item of candidatures) {
      candidaturesParStatut[item.statut] = item._count.id;
    }

    const entretiensParStatut: Record<string, number> = {};
    for (const item of entretiens) {
      entretiensParStatut[item.statut] = item._count.id;
    }

    return {
      entreprise: {
        id: partenaire.id,
        nomEntreprise: partenaire.nomEntreprise,
        ville: partenaire.ville,
        email: partenaire.email,
      },
      stats: {
        offresStage: {
          total: totalOffresStage,
          actives: totalOffresStage - archivedOffresStage,
          archivees: archivedOffresStage,
        },
        offresEmploi: {
          total: totalOffresEmploi,
          actives: totalOffresEmploi - archivedOffresEmploi,
          archivees: archivedOffresEmploi,
        },
        candidatures: {
          total: candidaturesTotal,
          parStatut: candidaturesParStatut,
        },
        entretiens: {
          total: entretiensTotal,
          parStatut: entretiensParStatut,
        },
      },
      offresRecents: {
        stages: offresStage.map((offre) => ({
          id: offre.id,
          titre: offre.titre,
          ville: offre.ville,
          domaine: offre.domaine,
          statut: offre.isArchived ? 'ARCHIVEE' : 'ACTIVE',
          datePublication: offre.datePublication,
        })),
        emplois: offresEmploi.map((offre) => ({
          id: offre.id,
          titre: offre.titre,
          ville: offre.ville,
          domaine: offre.domaine,
          statut: offre.isArchived ? 'ARCHIVEE' : 'ACTIVE',
          datePublication: offre.datePublication,
        })),
      },
    };
  }

  async getStats(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartnerOrNull(utilisateur);

    if (!partenaire) {
      return {
        entreprise: null,
        offres: {
          stages: { total: 0, actives: 0 },
          emplois: { total: 0, actives: 0 },
        },
        candidatures: { total: 0, parStatut: {} },
        entretiens: { total: 0, parStatut: {} },
      };
    }

    const [totalOffresStage, totalOffresEmploi, totalCandidatures, totalEntretiens, candidaturesParStatut, entretiensParStatut] = await Promise.all([
      this.prisma.offreStage.count({ where: { partenaireId: partenaire.id } }),
      this.prisma.offreEmploi.count({ where: { partenaireId: partenaire.id } }),
      this.prisma.candidature.count({
        where: {
          OR: [
            { offreStage: { partenaireId: partenaire.id } },
            { offreEmploi: { partenaireId: partenaire.id } },
          ],
        },
      }),
      this.prisma.entretien.count({ where: { partenaireId: partenaire.id } }),
      this.prisma.candidature.groupBy({
        by: ['statut'],
        where: {
          OR: [
            { offreStage: { partenaireId: partenaire.id } },
            { offreEmploi: { partenaireId: partenaire.id } },
          ],
        },
        _count: { id: true },
      }),
      this.prisma.entretien.groupBy({
        by: ['statut'],
        where: { partenaireId: partenaire.id },
        _count: { id: true },
      }),
    ]);

    const candidaturesMap: Record<string, number> = {};
    for (const item of candidaturesParStatut) {
      candidaturesMap[item.statut] = item._count.id;
    }

    const entretiensMap: Record<string, number> = {};
    for (const item of entretiensParStatut) {
      entretiensMap[item.statut] = item._count.id;
    }

    return {
      entreprise: {
        id: partenaire.id,
        nomEntreprise: partenaire.nomEntreprise,
        ville: partenaire.ville,
      },
      offres: {
        stages: {
          total: totalOffresStage,
          actives: totalOffresStage,
        },
        emplois: {
          total: totalOffresEmploi,
          actives: totalOffresEmploi,
        },
      },
      candidatures: {
        total: totalCandidatures,
        parStatut: candidaturesMap,
      },
      entretiens: {
        total: totalEntretiens,
        parStatut: entretiensMap,
      },
    };
  }

  async planifierEntretien(utilisateur: EntrepriseUser, donnees: PlanifierEntretienDto) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id: donnees.candidatureId },
      include: { offreStage: true, offreEmploi: true },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature introuvable');
    }

    const partenaire = await this.getPartner(utilisateur);

    const offrePartenaireId = candidature.offreStage?.partenaireId ?? candidature.offreEmploi?.partenaireId;

    if (offrePartenaireId !== partenaire.id) {
      throw new ForbiddenException('Cette candidature n appartient pas a votre entreprise');
    }

    const entretien = await this.prisma.entretien.create({
      data: {
        partenaireId: partenaire.id,
        candidatureId: candidature.id,
        offreStageId: candidature.offreStageId,
        offreEmploiId: candidature.offreEmploiId,
        utilisateurId: candidature.utilisateurId,
        dateProposee: new Date(donnees.dateProposee),
        lieu: donnees.lieu ?? null,
        message: donnees.message ?? null,
      },
    });

    await this.prisma.notification.create({
      data: {
        utilisateurId: candidature.utilisateurId,
        titre: 'Entretien planifié',
        message: `Un entretien a été planifié pour le ${new Date(donnees.dateProposee).toLocaleDateString('fr-FR')}.`,
        type: 'ENTRETIEN',
      },
    });

    return entretien;
  }

  async changerStatutCandidature(
    utilisateur: EntrepriseUser,
    candidatureId: string,
    donnees: ChangerStatutCandidatureDto,
  ) {
    const partenaire = await this.getPartner(utilisateur);

    const candidature = await this.prisma.candidature.findFirst({
      where: {
        id: candidatureId,
        OR: [
          { offreStage: { partenaireId: partenaire.id } },
          { offreEmploi: { partenaireId: partenaire.id } },
        ],
      },
      include: { utilisateur: true },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature introuvable ou non autorisée');
    }

    if (candidature.statut === 'ANNULEE') {
      throw new BadRequestException('Impossible de modifier une candidature annulée');
    }

    const updated = await this.prisma.candidature.update({
      where: { id: candidatureId },
      data: { statut: donnees.statut as any },
    });

    const messages: Record<string, string> = {
      EN_COURS: 'Votre candidature est en cours de traitement.',
      ACCEPTEE: 'Félicitations ! Votre candidature a été acceptée.',
      REFUSEE: 'Votre candidature n\'a pas été retenue.',
    };

    await this.prisma.notification.create({
      data: {
        utilisateurId: candidature.utilisateurId,
        titre: 'Mise à jour de votre candidature',
        message: messages[donnees.statut] ?? `Statut mis à jour : ${donnees.statut}`,
        type: 'CANDIDATURE',
      },
    });

    return {
      id: updated.id,
      statut: updated.statut,
      message: 'Statut de la candidature mis à jour',
    };
  }

  async changerStatutEntretien(
    utilisateur: EntrepriseUser,
    entretienId: string,
    donnees: ChangerStatutEntretienDto,
  ) {
    const partenaire = await this.getPartner(utilisateur);

    const entretien = await this.prisma.entretien.findFirst({
      where: { id: entretienId, partenaireId: partenaire.id },
    });

    if (!entretien) {
      throw new NotFoundException('Entretien introuvable ou non autorisé');
    }

    if (entretien.statut === 'ANNULE' || entretien.statut === 'TERMINE') {
      throw new BadRequestException(`Impossible de modifier un entretien avec le statut "${entretien.statut}"`);
    }

    const updated = await this.prisma.entretien.update({
      where: { id: entretienId },
      data: { statut: donnees.statut as any },
    });

    const messages: Record<string, string> = {
      CONFIRME: `Votre entretien du ${new Date(entretien.dateProposee).toLocaleDateString('fr-FR')} a été confirmé.`,
      ANNULE: `Votre entretien du ${new Date(entretien.dateProposee).toLocaleDateString('fr-FR')} a été annulé.`,
      TERMINE: `Votre entretien du ${new Date(entretien.dateProposee).toLocaleDateString('fr-FR')} est marqué comme terminé.`,
    };

    await this.prisma.notification.create({
      data: {
        utilisateurId: entretien.utilisateurId,
        titre: 'Mise à jour de votre entretien',
        message: messages[donnees.statut] ?? `Statut entretien mis à jour : ${donnees.statut}`,
        type: 'ENTRETIEN',
      },
    });

    return {
      id: updated.id,
      statut: updated.statut,
      message: 'Statut de l entretien mis à jour',
    };
  }

  private async getOrCreatePartner(utilisateur: EntrepriseUser, ville: string) {
    if (!utilisateur.entreprise) {
      throw new BadRequestException('Le role ENTREPRISE requiert un nom d entreprise');
    }

    const existingByUser = await this.prisma.partner.findFirst({
      where: { userId: utilisateur.id },
    });

    if (existingByUser) {
      return existingByUser;
    }

    const existingByEmail = await this.prisma.partner.findUnique({
      where: { email: utilisateur.email.toLowerCase() },
    });

    if (existingByEmail) {
      if (existingByEmail.userId && existingByEmail.userId !== utilisateur.id) {
        throw new ForbiddenException('Ce compte entreprise est deja assigne');
      }

      return this.prisma.partner.update({
        where: { id: existingByEmail.id },
        data: { userId: utilisateur.id },
      });
    }

    return this.prisma.partner.create({
      data: {
        nomEntreprise: utilisateur.entreprise,
        email: utilisateur.email.toLowerCase(),
        ville,
        lienSiteWeb: null,
        userId: utilisateur.id,
      },
    });
  }

  private async getPartnerOrNull(utilisateur: EntrepriseUser) {
    if (!utilisateur.entreprise) {
      throw new BadRequestException('Le role ENTREPRISE requiert un nom d entreprise');
    }

    return this.prisma.partner.findFirst({
      where: {
        OR: [{ userId: utilisateur.id }, { email: utilisateur.email.toLowerCase() }],
      },
    });
  }

  private async getPartner(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartnerOrNull(utilisateur);

    if (!partenaire) {
      throw new NotFoundException('Aucune entreprise associee n a ete trouvee');
    }

    return partenaire;
  }

  private async findOffreStageOwnedByEntreprise(utilisateur: EntrepriseUser, id: string) {
    const partenaire = await this.getPartner(utilisateur);

    const offre = await this.prisma.offreStage.findFirst({
      where: {
        id,
        partenaireId: partenaire.id,
      },
    });

    if (!offre) {
      throw new NotFoundException('Offre de stage introuvable ou non autorisee');
    }

    return offre;
  }

  private async findOffreEmploiOwnedByEntreprise(utilisateur: EntrepriseUser, id: string) {
    const partenaire = await this.getPartner(utilisateur);

    const offre = await this.prisma.offreEmploi.findFirst({
      where: {
        id,
        partenaireId: partenaire.id,
      },
    });

    if (!offre) {
      throw new NotFoundException('Offre d emploi introuvable ou non autorisee');
    }

    return offre;
  }

  async getStatistiques(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartner(utilisateur);

    const [
      offresStageActives,
      offresStageArchivees,
      offresEmploiActives,
      offresEmploiArchivees,
      candidatures,
      entretiens,
      evaluations,
    ] = await Promise.all([
      this.prisma.offreStage.count({ where: { partenaireId: partenaire.id, isArchived: false } }),
      this.prisma.offreStage.count({ where: { partenaireId: partenaire.id, isArchived: true } }),
      this.prisma.offreEmploi.count({ where: { partenaireId: partenaire.id, isArchived: false } }),
      this.prisma.offreEmploi.count({ where: { partenaireId: partenaire.id, isArchived: true } }),
      this.prisma.candidature.findMany({
        where: {
          OR: [
            { offreStage: { partenaireId: partenaire.id } },
            { offreEmploi: { partenaireId: partenaire.id } },
          ],
        },
        select: { id: true, statut: true },
      }),
      this.prisma.entretien.findMany({
        where: { partenaireId: partenaire.id },
        select: { id: true, statut: true },
      }),
      this.prisma.evaluationCroisee.findMany({
        where: { partenaireId: partenaire.id },
        select: { note: true },
      }),
    ]);

    const candidaturesParStatut = {
      enAttente: candidatures.filter((c) => c.statut === 'EN_ATTENTE').length,
      enCours: candidatures.filter((c) => c.statut === 'EN_COURS').length,
      acceptees: candidatures.filter((c) => c.statut === 'ACCEPTEE').length,
      refusees: candidatures.filter((c) => c.statut === 'REFUSEE').length,
      annulees: candidatures.filter((c) => c.statut === 'ANNULEE').length,
    };

    const entretiensParStatut = {
      proposes: entretiens.filter((e) => e.statut === 'PROPOSE').length,
      confirmes: entretiens.filter((e) => e.statut === 'CONFIRME').length,
      termines: entretiens.filter((e) => e.statut === 'TERMINE').length,
      annules: entretiens.filter((e) => e.statut === 'ANNULE').length,
    };

    const tauxAcceptation =
      candidatures.length > 0
        ? Math.round((candidaturesParStatut.acceptees / candidatures.length) * 100)
        : 0;

    const noteMoyenne =
      evaluations.length > 0
        ? Number((evaluations.reduce((sum, e) => sum + e.note, 0) / evaluations.length).toFixed(1))
        : null;

    return {
      partenaire: {
        id: partenaire.id,
        nomEntreprise: partenaire.nomEntreprise,
        ville: partenaire.ville,
      },
      offres: {
        stages: {
          actives: offresStageActives,
          archivees: offresStageArchivees,
          total: offresStageActives + offresStageArchivees,
        },
        emplois: {
          actives: offresEmploiActives,
          archivees: offresEmploiArchivees,
          total: offresEmploiActives + offresEmploiArchivees,
        },
        totalActives: offresStageActives + offresEmploiActives,
      },
      candidatures: {
        total: candidatures.length,
        parStatut: candidaturesParStatut,
        tauxAcceptation,
        stagiairesRecrutes: candidaturesParStatut.acceptees,
      },
      entretiens: {
        total: entretiens.length,
        parStatut: entretiensParStatut,
      },
      satisfaction: {
        totalEvaluations: evaluations.length,
        noteMoyenne,
      },
    };
  }

  private async notifierAbonnesAlertes(
    typeOffre: 'STAGE' | 'EMPLOI',
    titre: string,
    ville: string,
    domaine?: string | null,
  ) {
    try {
      const alertes = await this.prisma.notification.findMany({
        where: { type: 'ALERTE_OFFRE' },
        select: { utilisateurId: true, message: true },
      });

      const userIdsToNotify = new Set<string>();
      for (const alerte of alertes) {
        const msg = (alerte.message || '').toLowerCase();
        const matchesVille = ville && msg.includes(ville.toLowerCase());
        const matchesDomaine = domaine && msg.includes(domaine.toLowerCase());
        const matchesType = msg.includes(typeOffre.toLowerCase());

        if (matchesVille || matchesDomaine || matchesType || msg.includes('vos critères')) {
          userIdsToNotify.add(alerte.utilisateurId);
        }
      }

      for (const uid of userIdsToNotify) {
        await this.prisma.notification.create({
          data: {
            utilisateurId: uid,
            titre: `Nouvelle offre de ${typeOffre.toLowerCase()} : ${titre}`,
            message: `Une nouvelle opportunité correspondant à vos alertes est disponible à ${ville}.`,
            type: 'NOUVELLE_OFFRE',
          },
        });
      }
    } catch {
      // Notification best effort
    }
  }
}
