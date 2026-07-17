import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FormationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listerCatalogue() {
    const formations = await this.prisma.formation.findMany({
      where: { estActive: true },
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
}
