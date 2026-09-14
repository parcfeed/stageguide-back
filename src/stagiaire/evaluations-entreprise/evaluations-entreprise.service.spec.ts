import { EvaluationsEntrepriseService } from './evaluations-entreprise.service';

describe('EvaluationsEntrepriseService', () => {
  it('crée une évaluation entreprise pour un stagiaire', async () => {
    const prisma = {
      evaluationCroisee: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'eval-1',
          stagiaireId: 'user-1',
          partenaireId: 'partner-1',
          note: 4,
          commentaire: 'Très bonne entreprise',
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'eval-1',
            note: 4,
            commentaire: 'Très bonne entreprise',
            partenaire: { id: 'partner-1', nomEntreprise: 'Acme' },
          },
        ]),
      },
      partner: {
        findUnique: jest.fn().mockResolvedValue({ id: 'partner-1', nomEntreprise: 'Acme' }),
      },
    } as any;

    const service = new EvaluationsEntrepriseService(prisma);

    const result = await service.soumettreEvaluation('user-1', {
      partenaireId: 'partner-1',
      note: 4,
      commentaire: 'Très bonne entreprise',
    });

    expect(prisma.evaluationCroisee.create).toHaveBeenCalled();
    expect(result.note).toBe(4);
    expect(result.message).toContain('Évaluation');
  });

  it('liste les évaluations de l entreprise reçues par le stagiaire', async () => {
    const prisma = {
      evaluationCroisee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'eval-1',
            note: 5,
            commentaire: 'Excellent encadrement',
            partenaire: { id: 'partner-1', nomEntreprise: 'Acme' },
          },
        ]),
      },
    } as any;

    const service = new EvaluationsEntrepriseService(prisma);
    const result = await service.listerEvaluations('user-1');

    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0].partenaire.nomEntreprise).toBe('Acme');
  });
});
