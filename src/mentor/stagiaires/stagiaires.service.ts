import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StagiairesService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(mentorId: string) {
    const demandesAcceptees = await this.prisma.demandeMentorat.findMany({
      where: { mentorId, statut: 'ACCEPTEE' },
      include: {
        stagiaire: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            ecole: true,
            niveauEtudes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stagiaires = demandesAcceptees.map((d) => d.stagiaire);

    return {
      mentorId,
      stagiaires,
    };
  }
}
