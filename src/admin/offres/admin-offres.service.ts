import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminOffresService {
  constructor(private readonly prisma: PrismaService) {}

  async listerOffres(filtres?: { type?: 'stage' | 'emploi'; search?: string }) {
    const whereCondition: any = {};

    if (filtres?.search) {
      whereCondition.OR = [
        { titre: { contains: filtres.search, mode: 'insensitive' } },
        { ville: { contains: filtres.search, mode: 'insensitive' } },
        { domaine: { contains: filtres.search, mode: 'insensitive' } },
      ];
    }

    const includePartner = {
      partenaire: {
        select: { id: true, nomEntreprise: true, ville: true, email: true },
      },
      _count: {
        select: { candidatures: true },
      },
    };

    let offresStage: any[] = [];
    let offresEmploi: any[] = [];

    if (!filtres?.type || filtres.type === 'stage') {
      offresStage = await this.prisma.offreStage.findMany({
        where: whereCondition,
        include: includePartner,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!filtres?.type || filtres.type === 'emploi') {
      offresEmploi = await this.prisma.offreEmploi.findMany({
        where: whereCondition,
        include: includePartner,
        orderBy: { createdAt: 'desc' },
      });
    }

    return {
      total: offresStage.length + offresEmploi.length,
      stages: offresStage.map((o) => ({ ...o, type: 'STAGE' })),
      emplois: offresEmploi.map((o) => ({ ...o, type: 'EMPLOI' })),
    };
  }

  async modererOffreStage(id: string, action: 'valider' | 'archiver') {
    const offre = await this.prisma.offreStage.findUnique({ where: { id } });
    if (!offre) {
      throw new NotFoundException('Offre de stage introuvable');
    }

    const updated = await this.prisma.offreStage.update({
      where: { id },
      data: { isArchived: action === 'archiver' },
    });

    return {
      id: updated.id,
      titre: updated.titre,
      isArchived: updated.isArchived,
      message: action === 'valider' ? 'Offre de stage approuvée avec succès' : 'Offre de stage archivée/modérée',
    };
  }

  async modererOffreEmploi(id: string, action: 'valider' | 'archiver') {
    const offre = await this.prisma.offreEmploi.findUnique({ where: { id } });
    if (!offre) {
      throw new NotFoundException('Offre d emploi introuvable');
    }

    const updated = await this.prisma.offreEmploi.update({
      where: { id },
      data: { isArchived: action === 'archiver' },
    });

    return {
      id: updated.id,
      titre: updated.titre,
      isArchived: updated.isArchived,
      message: action === 'valider' ? 'Offre d emploi approuvée avec succès' : 'Offre d emploi archivée/modérée',
    };
  }

  async supprimerOffreStage(id: string) {
    const offre = await this.prisma.offreStage.findUnique({ where: { id } });
    if (!offre) {
      throw new NotFoundException('Offre de stage introuvable');
    }

    await this.prisma.offreStage.delete({ where: { id } });
    return { id, message: 'Offre de stage supprimée avec succès' };
  }

  async supprimerOffreEmploi(id: string) {
    const offre = await this.prisma.offreEmploi.findUnique({ where: { id } });
    if (!offre) {
      throw new NotFoundException('Offre d emploi introuvable');
    }

    await this.prisma.offreEmploi.delete({ where: { id } });
    return { id, message: 'Offre d emploi supprimée avec succès' };
  }
}
