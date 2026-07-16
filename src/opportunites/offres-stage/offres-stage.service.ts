import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListerOffresStageDto } from './dto/lister-offres-stage.dto';

@Injectable()
export class OffresStageService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(filtres: ListerOffresStageDto) {
    const where: any = {
      isArchived: false,
    };

    if (filtres.search) {
      where.OR = [
        { titre: { contains: filtres.search, mode: 'insensitive' } },
        { description: { contains: filtres.search, mode: 'insensitive' } },
        { domaine: { contains: filtres.search, mode: 'insensitive' } },
      ];
    }

    if (filtres.ville) {
      where.ville = { contains: filtres.ville, mode: 'insensitive' };
    }

    if (filtres.domaine) {
      where.domaine = { contains: filtres.domaine, mode: 'insensitive' };
    }

    if (filtres.remote !== undefined) {
      where.remote = filtres.remote;
    }

    const offres = await this.prisma.offreStage.findMany({
      where,
      include: {
        partenaire: {
          select: {
            id: true,
            nomEntreprise: true,
            ville: true,
            email: true,
            lienSiteWeb: true,
          },
        },
      },
      orderBy: { datePublication: 'desc' },
    });

    return { filtres, offres };
  }
}
