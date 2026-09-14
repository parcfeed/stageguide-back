import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangerStatutConventionDto } from './dto/changer-statut-convention.dto';
import { CreerConventionDto } from './dto/creer-convention.dto';

@Injectable()
export class ConventionsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(stagiaireId: string) {
    const conventions = await this.prisma.convention.findMany({
      where: { utilisateurId: stagiaireId },
      include: {
        partenaire: {
          select: { id: true, nomEntreprise: true, ville: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      stagiaireId,
      conventions,
    };
  }

  async creer(stagiaireId: string, donnees: CreerConventionDto) {
    const convention = await this.prisma.convention.create({
      data: {
        utilisateurId: stagiaireId,
        entrepriseNom: donnees.entrepriseNom,
        mentorNom: donnees.mentorNom ?? null,
        dateDebut: donnees.dateDebut ? new Date(donnees.dateDebut) : null,
        dateFin: donnees.dateFin ? new Date(donnees.dateFin) : null,
      },
    });

    return {
      id: convention.id,
      stagiaireId: convention.utilisateurId,
      statut: convention.statut,
      entrepriseNom: convention.entrepriseNom,
      mentorNom: convention.mentorNom,
      dateDebut: convention.dateDebut,
      dateFin: convention.dateFin,
      message: 'Convention creee avec succes',
    };
  }

  async changerStatut(
    stagiaireId: string,
    conventionId: string,
    donnees: ChangerStatutConventionDto,
  ) {
    const convention = await this.prisma.convention.findFirst({
      where: { id: conventionId, utilisateurId: stagiaireId },
    });

    if (!convention) {
      throw new NotFoundException('Convention introuvable');
    }

    const miseAJour = await this.prisma.convention.update({
      where: { id: conventionId },
      data: { statut: donnees.statut },
    });

    return {
      id: miseAJour.id,
      stagiaireId: miseAJour.utilisateurId,
      statut: miseAJour.statut,
      entrepriseNom: miseAJour.entrepriseNom,
      mentorNom: miseAJour.mentorNom,
      dateDebut: miseAJour.dateDebut,
      dateFin: miseAJour.dateFin,
      message: 'Statut de la convention mis à jour avec succès',
    };
  }
}
