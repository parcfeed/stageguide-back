import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreerCandidatureDto } from './dto/creer-candidature.dto';

@Injectable()
export class CandidaturesService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(utilisateurId: string) {
    return this.prisma.candidature.findMany({
      where: { utilisateurId },
      include: {
        offreStage: {
          include: { partenaire: true },
        },
        offreEmploi: {
          include: { partenaire: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async creer(utilisateurId: string, donnees: CreerCandidatureDto) {
    const offreStageId = donnees.offreStageId?.trim() || null;
    const offreEmploiId = donnees.offreEmploiId?.trim() || null;

    if ((!offreStageId && !offreEmploiId) || (offreStageId && offreEmploiId)) {
      throw new BadRequestException('Veuillez fournir une seule offre de stage ou d emploi.');
    }

    const existing = await this.prisma.candidature.findFirst({
      where: {
        utilisateurId,
        offreStageId,
        offreEmploiId,
      },
    });

    if (existing) {
      throw new BadRequestException('Vous avez déjà postulé à cette offre.');
    }

    const offre = offreStageId
      ? await this.prisma.offreStage.findUnique({ where: { id: offreStageId } })
      : await this.prisma.offreEmploi.findUnique({ where: { id: offreEmploiId! } });

    if (!offre) {
      throw new NotFoundException('Offre introuvable.');
    }

    const candidature = await this.prisma.candidature.create({
      data: {
        utilisateurId,
        offreStageId,
        offreEmploiId,
        message: donnees.message ?? null,
      },
      include: {
        utilisateur: true,
        offreStage: {
          include: { partenaire: true },
        },
        offreEmploi: {
          include: { partenaire: true },
        },
      },
    });

    const partenaireId = candidature.offreStage?.partenaireId ?? candidature.offreEmploi?.partenaireId;
    if (partenaireId) {
      const partenaire = await this.prisma.partner.findUnique({
        where: { id: partenaireId },
        select: { userId: true },
      });
      if (partenaire?.userId) {
        await this.prisma.notification.create({
          data: {
            utilisateurId: partenaire.userId,
            titre: 'Nouvelle candidature',
            message: `${candidature.utilisateur.prenom} ${candidature.utilisateur.nom} a postulé à une offre.`,
            type: 'CANDIDATURE',
          },
        });
      }
    }

    return candidature;
  }
}
