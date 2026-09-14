import { FormationsService } from './formations.service';

describe('FormationsService', () => {
  it('met à jour la progression d une inscription avec pourcentage et statut', async () => {
    const prisma = {
      inscriptionFormation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inscription-1',
          utilisateurId: 'user-1',
          formationId: 'formation-1',
          progression: 0,
          completedAt: null,
          formation: { modules: [{ id: 'm1' }, { id: 'm2' }] },
        }),
        update: jest.fn().mockImplementation(async (_args) => ({
          id: 'inscription-1',
          utilisateurId: 'user-1',
          formationId: 'formation-1',
          progression: 50,
          completedAt: null,
        })),
      },
      moduleFormation: {
        count: jest.fn().mockResolvedValue(2),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'n-1' }),
      },
      formation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'formation-1', titre: 'Node.js' }),
      },
    } as any;

    const service = new FormationsService(prisma);
    const result = await service.updateProgression('user-1', 'formation-1', {
      progression: 50,
    });

    expect(result.progression).toBe(50);
    expect(result.pourcentage).toBe(50);
    expect(result.statut).toBe('EN_COURS');
  });
});
