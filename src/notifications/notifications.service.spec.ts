import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('should list notifications for a user in descending creation order', async () => {
    const prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'notif-1', titre: 'Nouvelle offre', message: 'Une offre a été ajoutée', estLue: false },
        ]),
      },
    };

    const service = new NotificationsService(prisma as any);
    const result = await service.lister('user-1');

    expect(result.utilisateurId).toBe('user-1');
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].titre).toBe('Nouvelle offre');
  });

  it('should mark a specific notification as read', async () => {
    const notification = { id: 'notif-1', utilisateurId: 'user-1', estLue: false };
    const prisma = {
      notification: {
        findFirst: jest.fn().mockResolvedValue(notification),
        update: jest.fn().mockResolvedValue({ ...notification, estLue: true }),
      },
    };

    const service = new NotificationsService(prisma as any);
    const result = await service.marquerLue('user-1', 'notif-1');

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { estLue: true },
    });
    expect(result.estLue).toBe(true);
  });

  it('should throw when trying to mark an unknown notification as read', async () => {
    const prisma = {
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new NotificationsService(prisma as any);

    await expect(service.marquerLue('user-1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('should create a notification record', async () => {
    const prisma = {
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-2', titre: 'Rappel', message: 'Rappel' }),
      },
    };

    const service = new NotificationsService(prisma as any);
    const result = await service.creer({
      utilisateurId: 'user-1',
      titre: 'Rappel',
      message: 'Rappel',
      type: 'SYSTEME',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        utilisateurId: 'user-1',
        titre: 'Rappel',
        message: 'Rappel',
        type: 'SYSTEME',
      },
    });
    expect(result.titre).toBe('Rappel');
  });
});
