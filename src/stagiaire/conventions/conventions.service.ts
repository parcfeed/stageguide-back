import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
}
