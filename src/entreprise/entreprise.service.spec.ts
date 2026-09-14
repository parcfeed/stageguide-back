import { EntrepriseService } from './entreprise.service';

describe('EntrepriseService', () => {
  it('should return a dashboard summary for the connected company', async () => {
    const prisma = {
      partner: {
        findFirst: jest.fn().mockResolvedValue({ id: 'partner-1', nomEntreprise: 'Acme', ville: 'Paris' }),
      },
      offreStage: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          { id: 'stage-1', titre: 'Stage dev', isArchived: false },
          { id: 'stage-2', titre: 'Stage data', isArchived: true },
        ]),
      },
      offreEmploi: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          { id: 'job-1', titre: 'Dev', isArchived: false },
        ]),
      },
      candidature: {
        count: jest.fn().mockResolvedValue(5),
        groupBy: jest.fn().mockResolvedValue([
          { statut: 'EN_ATTENTE', _count: { id: 2 } },
          { statut: 'ACCEPTEE', _count: { id: 1 } },
        ]),
      },
      entretien: {
        count: jest.fn().mockResolvedValue(4),
        groupBy: jest.fn().mockResolvedValue([
          { statut: 'PROPOSE', _count: { id: 2 } },
          { statut: 'CONFIRME', _count: { id: 2 } },
        ]),
      },
    };

    const service = new EntrepriseService(prisma as any);

    const result = await service.getTableauDeBord({
      id: 'user-1',
      email: 'contact@acme.fr',
      entreprise: 'Acme',
    });

    expect(result.entreprise).toMatchObject({
      id: 'partner-1',
      nomEntreprise: 'Acme',
    });
    expect(result.stats.offresStage.total).toBe(3);
    expect(result.stats.offresEmploi.total).toBe(2);
    expect(result.stats.candidatures.total).toBe(5);
    expect(result.stats.entretiens.total).toBe(4);
  });

  it('should return detailed stats for the company activity', async () => {
    const prisma = {
      partner: {
        findFirst: jest.fn().mockResolvedValue({ id: 'partner-1', nomEntreprise: 'Acme', ville: 'Paris', email: 'contact@acme.fr' }),
      },
      offreStage: {
        count: jest.fn().mockResolvedValue(4),
      },
      offreEmploi: {
        count: jest.fn().mockResolvedValue(3),
      },
      candidature: {
        count: jest.fn().mockResolvedValue(12),
        groupBy: jest.fn().mockResolvedValue([
          { statut: 'EN_ATTENTE', _count: { id: 5 } },
          { statut: 'EN_COURS', _count: { id: 4 } },
          { statut: 'ACCEPTEE', _count: { id: 3 } },
        ]),
      },
      entretien: {
        count: jest.fn().mockResolvedValue(8),
        groupBy: jest.fn().mockResolvedValue([
          { statut: 'PROPOSE', _count: { id: 3 } },
          { statut: 'CONFIRME', _count: { id: 3 } },
          { statut: 'TERMINE', _count: { id: 2 } },
        ]),
      },
    };

    const service = new EntrepriseService(prisma as any);

    const result = await service.getStats({
      id: 'user-1',
      email: 'contact@acme.fr',
      entreprise: 'Acme',
    });

    expect(result.offres.stages.total).toBe(4);
    expect(result.offres.emplois.total).toBe(3);
    expect(result.candidatures.total).toBe(12);
    expect(result.entretiens.total).toBe(8);
    expect(result.candidatures.parStatut.EN_ATTENTE).toBe(5);
  });

  it('should return empty lists instead of 404 when an enterprise has no partner yet', async () => {
    const prisma = {
      partner: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      offreStage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      offreEmploi: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      candidature: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      entretien: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const service = new EntrepriseService(prisma as any);

    await expect(service.listerOffresStage({ id: 'user-1', email: 'contact@acme.fr', entreprise: 'Acme' })).resolves.toEqual([]);
    await expect(service.listerOffresEmploi({ id: 'user-1', email: 'contact@acme.fr', entreprise: 'Acme' })).resolves.toEqual([]);
    await expect(service.listerCandidatures({ id: 'user-1', email: 'contact@acme.fr', entreprise: 'Acme' })).resolves.toEqual([]);
  });

  it('should allow an enterprise to submit a cross-evaluation for a trainee', async () => {
    const createEvaluation = jest.fn().mockResolvedValue({
      id: 'eval-1',
      note: 5,
      commentaire: 'Très pro',
    });

    const prisma = {
      partner: {
        findFirst: jest.fn().mockResolvedValue({ id: 'partner-1', nomEntreprise: 'Acme', ville: 'Paris', email: 'contact@acme.fr' }),
      },
      candidature: {
        findFirst: jest.fn().mockResolvedValue({ id: 'candidature-1', utilisateurId: 'user-2', offreStage: { partenaireId: 'partner-1' } }),
      },
      evaluationCroisee: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: createEvaluation,
      },
    };

    const service = new EntrepriseService(prisma as any);

    const result = await service.soumettreEvaluation({
      id: 'user-1',
      email: 'contact@acme.fr',
      entreprise: 'Acme',
    }, {
      stagiaireId: 'user-2',
      note: 5,
      commentaire: 'Très pro',
    });

    expect(createEvaluation).toHaveBeenCalled();
    expect(result.note).toBe(5);
    expect(result.message.toLowerCase()).toContain('évaluation');
  });
});
