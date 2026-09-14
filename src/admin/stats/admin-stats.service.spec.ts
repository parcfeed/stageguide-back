import { AdminStatsService } from './admin-stats.service';

describe('AdminStatsService', () => {
  it('should return offers awaiting review for admin validation', async () => {
    const prisma = {
      offreStage: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'stage-1', titre: 'Stage backend', partenaire: { nomEntreprise: 'Acme' } },
        ]),
      },
      offreEmploi: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'job-1', titre: 'Dev backend', partenaire: { nomEntreprise: 'Globex' } },
        ]),
      },
    };

    const service = new AdminStatsService(prisma as any);

    const result = await service.getValidationQueue();

    expect(result.stages).toHaveLength(1);
    expect(result.emplois).toHaveLength(1);
    expect(result.total).toBe(2);
    expect(result.stages[0].titre).toBe('Stage backend');
  });

  it('should approve a pending offer and keep it available to candidates', async () => {
    const updateStage = jest.fn().mockResolvedValue({ id: 'stage-1', isArchived: false });
    const notificationCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      offreStage: {
        findUnique: jest.fn().mockResolvedValue({ id: 'stage-1', titre: 'Stage backend', partenaireId: 'partner-1', isArchived: true }),
        update: updateStage,
      },
      notification: {
        create: notificationCreate,
      },
    };

    const service = new AdminStatsService(prisma as any);
    const result = await service.validerOffre('stage', 'stage-1', 'APPROUVE');

    expect(updateStage).toHaveBeenCalledWith({
      where: { id: 'stage-1' },
      data: { isArchived: false },
    });
    expect(result.statut).toBe('APPROUVE');
    expect(result.message).toContain('approuvée');
  });
});
