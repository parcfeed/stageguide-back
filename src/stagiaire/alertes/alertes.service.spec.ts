import { AlertesService } from './alertes.service';

describe('AlertesService', () => {
  it('crée une alerte avec des critères et renvoie un message de confirmation', async () => {
    const prisma = {
      notification: {
        create: jest.fn().mockResolvedValue({
          id: 'alerte-1',
          utilisateurId: 'user-1',
          titre: 'Alerte de recherche activée',
          message: 'Alerte activée pour Informatique • Paris • STAGE.',
          type: 'ALERTE_OFFRE',
        }),
        findFirst: jest.fn().mockResolvedValue({ id: 'alerte-1', utilisateurId: 'user-1', type: 'ALERTE_OFFRE' }),
        delete: jest.fn().mockResolvedValue({ id: 'alerte-1' }),
      },
    } as any;

    const service = new AlertesService(prisma);
    const result = await service.creer('user-1', {
      domaine: 'Informatique',
      ville: 'Paris',
      type: 'STAGE',
    });

    expect(prisma.notification.create).toHaveBeenCalled();
    expect(result.message).toContain('Alerte créée');
    expect(result.domaine).toBe('Informatique');
    expect(result.ville).toBe('Paris');
  });

  it('rejette la création d une alerte sans aucun critère', async () => {
    const prisma = { notification: { create: jest.fn() } } as any;
    const service = new AlertesService(prisma);

    await expect(service.creer('user-1', {} as any)).rejects.toThrow('Au moins un critère est requis');
  });
});
