import { Injectable, NotFoundException } from '@nestjs/common';
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

  async marquerLue(utilisateurId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, utilisateurId },
    });

    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { estLue: true },
    });

    return {
      id: updated.id,
      estLue: updated.estLue,
      message: 'Notification marquée comme lue',
    };
  }

  async marquerToutesLues(utilisateurId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { utilisateurId, estLue: false },
      data: { estLue: true },
    });

    return {
      utilisateurId,
      count: result.count,
      message: `${result.count} notification(s) marquée(s) comme lue(s)`,
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
