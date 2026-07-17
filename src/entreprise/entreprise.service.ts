import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOffreStageDto } from './dto/create-offre-stage.dto';
import { UpdateOffreStageDto } from './dto/update-offre-stage.dto';
import { CreateOffreEmploiDto } from './dto/create-offre-emploi.dto';
import { UpdateOffreEmploiDto } from './dto/update-offre-emploi.dto';
import { PlanifierEntretienDto } from './dto/planifier-entretien.dto';

type EntrepriseUser = {
  id: string;
  email: string;
  entreprise?: string | null;
};

@Injectable()
export class EntrepriseService {
  constructor(private readonly prisma: PrismaService) {}

  async listerOffresStage(utilisateur: EntrepriseUser) {
    const partenaire = await this.getPartner(utilisateur);

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

    return this.prisma.offreStage.create({
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
    const partenaire = await this.getPartner(utilisateur);

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

    return this.prisma.offreEmploi.create({
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
    const partenaire = await this.getPartner(utilisateur);

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
    const partenaire = await this.getPartner(utilisateur);

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

  private async getPartner(utilisateur: EntrepriseUser) {
    if (!utilisateur.entreprise) {
      throw new BadRequestException('Le role ENTREPRISE requiert un nom d entreprise');
    }

    const partenaire = await this.prisma.partner.findFirst({
      where: {
        OR: [{ userId: utilisateur.id }, { email: utilisateur.email.toLowerCase() }],
      },
    });

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
}
