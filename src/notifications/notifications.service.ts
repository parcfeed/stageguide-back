import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(utilisateurId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      utilisateurId,
      notifications,
    };
  }

  async creer(donnees: {
    utilisateurId: string;
    titre: string;
    message: string;
    type?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        utilisateurId: donnees.utilisateurId,
        titre: donnees.titre,
        message: donnees.message,
        type: donnees.type ?? null,
      },
    });
  }
}
