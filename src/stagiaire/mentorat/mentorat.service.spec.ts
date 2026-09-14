import { NotFoundException } from '@nestjs/common';
import { MentoratStagiaireService } from './mentorat.service';

describe('MentoratStagiaireService', () => {
  it('should list active mentoring goals for a trainee', async () => {
    const prisma = {
      objectifMentorat: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'goal-1', titre: 'Améliorer la communication', statut: 'pending', utilisateurId: 'user-1' },
        ]),
      },
    };

    const service = new MentoratStagiaireService(prisma as any);
    const result = await service.listerObjectifs('user-1');

    expect(result.stagiaireId).toBe('user-1');
    expect(result.objectifs).toHaveLength(1);
    expect(result.objectifs[0].titre).toBe('Améliorer la communication');
  });

  it('should create an objective and return it with confirmation message', async () => {
    const prisma = {
      objectifMentorat: {
        create: jest.fn().mockResolvedValue({
          id: 'goal-2',
          utilisateurId: 'user-1',
          titre: 'Préparer la candidature',
          statut: 'pending',
          creePar: 'user-1',
        }),
      },
    };

    const service = new MentoratStagiaireService(prisma as any);
    const result = await service.creerObjectif('user-1', { titre: 'Préparer la candidature' });

    expect(prisma.objectifMentorat.create).toHaveBeenCalledWith({
      data: {
        utilisateurId: 'user-1',
        titre: 'Préparer la candidature',
        statut: 'pending',
        creePar: 'user-1',
      },
    });
    expect(result.message).toContain('créé');
  });

  it('should update an objective status for the owner', async () => {
    const prisma = {
      objectifMentorat: {
        findFirst: jest.fn().mockResolvedValue({ id: 'goal-3', utilisateurId: 'user-1' }),
        update: jest.fn().mockResolvedValue({
          id: 'goal-3',
          utilisateurId: 'user-1',
          titre: 'Finaliser le portfolio',
          statut: 'done',
        }),
      },
    };

    const service = new MentoratStagiaireService(prisma as any);
    const result = await service.modifierObjectif('user-1', 'goal-3', { statut: 'done' });

    expect(result.statut).toBe('done');
    expect(result.message).toContain('mis à jour');
  });

  it('should reject missing goal deletion', async () => {
    const prisma = {
      objectifMentorat: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new MentoratStagiaireService(prisma as any);

    await expect(service.supprimerObjectif('user-1', 'missing')).rejects.toThrow(NotFoundException);
  });
});
