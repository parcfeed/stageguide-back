import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OffresSauvegardeesService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(utilisateurId: string) {
    const sauvegardes = await this.prisma.offreSauvegardee.findMany({
      where: { utilisateurId },
      include: {
        offreStage: {
          include: {
            partenaire: {
              select: { id: true, nomEntreprise: true, ville: true },
            },
          },
        },
        offreEmploi: {
          include: {
            partenaire: {
              select: { id: true, nomEntreprise: true, ville: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { utilisateurId, sauvegardes };
  }

  async sauvegarder(
    utilisateurId: string,
    donnees: { offreStageId?: string; offreEmploiId?: string },
  ) {
    const offreStageId = donnees.offreStageId?.trim() || null;
    const offreEmploiId = donnees.offreEmploiId?.trim() || null;

    if ((!offreStageId && !offreEmploiId) || (offreStageId && offreEmploiId)) {
      throw new BadRequestException('Veuillez fournir une seule offre de stage ou d emploi');
    }

    // Vérifier que l'offre existe
    if (offreStageId) {
      const offre = await this.prisma.offreStage.findFirst({
        where: { id: offreStageId, isArchived: false },
      });
      if (!offre) throw new NotFoundException('Offre de stage introuvable');
    } else {
      const offre = await this.prisma.offreEmploi.findFirst({
        where: { id: offreEmploiId!, isArchived: false },
      });
      if (!offre) throw new NotFoundException('Offre d emploi introuvable');
    }

    // Vérifier doublon
    const existante = await this.prisma.offreSauvegardee.findFirst({
      where: {
        utilisateurId,
        ...(offreStageId ? { offreStageId } : { offreEmploiId }),
      },
    });

    if (existante) {
      throw new BadRequestException('Offre déjà sauvegardée');
    }

    const sauvegarde = await this.prisma.offreSauvegardee.create({
      data: {
        utilisateurId,
        offreStageId,
        offreEmploiId,
      },
    });

    return {
      id: sauvegarde.id,
      utilisateurId: sauvegarde.utilisateurId,
      offreStageId: sauvegarde.offreStageId,
      offreEmploiId: sauvegarde.offreEmploiId,
      createdAt: sauvegarde.createdAt,
      message: 'Offre sauvegardée avec succès',
    };
  }

  async supprimer(utilisateurId: string, sauvegardeId: string) {
    const sauvegarde = await this.prisma.offreSauvegardee.findFirst({
      where: { id: sauvegardeId, utilisateurId },
    });

    if (!sauvegarde) {
      throw new NotFoundException('Offre sauvegardée introuvable');
    }

    await this.prisma.offreSauvegardee.delete({
      where: { id: sauvegardeId },
    });

    return {
      id: sauvegardeId,
      message: 'Offre retirée des sauvegardes',
    };
  }
}
