import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreerAlerteDto } from './dto/creer-alerte.dto';

@Injectable()
export class AlertesService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(utilisateurId: string) {
    const alertes = await this.prisma.notification.findMany({
      where: {
        utilisateurId,
        type: 'ALERTE_OFFRE',
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      utilisateurId,
      alertes,
    };
  }

  async creer(utilisateurId: string, donnees: CreerAlerteDto) {
    const { domaine, ville, type } = donnees;

    if (!domaine && !ville && !type) {
      throw new BadRequestException('Au moins un critère est requis pour créer une alerte');
    }

    const alerte = await this.prisma.notification.create({
      data: {
        utilisateurId,
        titre: 'Alerte de recherche activée',
        message: `Alerte activée pour ${[domaine, ville, type].filter(Boolean).join(' • ') || 'vos critères'}.`,
        type: 'ALERTE_OFFRE',
      },
    });

    return {
      id: alerte.id,
      utilisateurId: alerte.utilisateurId,
      domaine: domaine ?? null,
      ville: ville ?? null,
      type: type ?? null,
      message: 'Alerte créée avec succès',
    };
  }

  async supprimer(utilisateurId: string, alerteId: string) {
    const alerte = await this.prisma.notification.findFirst({
      where: {
        id: alerteId,
        utilisateurId,
        type: 'ALERTE_OFFRE',
      },
    });

    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }

    await this.prisma.notification.delete({ where: { id: alerteId } });

    return {
      id: alerteId,
      message: 'Alerte supprimée avec succès',
    };
  }
}
