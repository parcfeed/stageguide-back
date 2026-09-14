import { StagiairesService } from './stagiaires.service';

describe('StagiairesService', () => {
  it('should return the mentor dashboard summary with active students, sessions and evaluation average', async () => {
    const prisma = {
      demandeMentorat: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'demande-1',
            stagiaireId: 'stagiaire-1',
            statut: 'ACCEPTEE',
            createdAt: new Date('2026-01-01T10:00:00Z'),
            stagiaire: {
              id: 'stagiaire-1',
              prenom: 'Ana',
              nom: 'Dupont',
              ecole: 'HEC',
              niveauEtudes: 'Master 2',
            },
          },
          {
            id: 'demande-2',
            stagiaireId: 'stagiaire-2',
            statut: 'EN_ATTENTE',
            createdAt: new Date('2026-01-02T10:00:00Z'),
            stagiaire: {
              id: 'stagiaire-2',
              prenom: 'Lucas',
              nom: 'Martin',
              ecole: 'Polytech',
              niveauEtudes: 'L3',
            },
          },
        ]),
      },
      sessionMentorat: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'session-1',
            stagiaireId: 'stagiaire-1',
            sujet: 'Suivi candidature',
            commenceLe: new Date('2026-02-01T14:00:00Z'),
            termineLe: new Date('2026-02-01T15:00:00Z'),
            statut: 'PLANIFIEE',
          },
        ]),
      },
      evaluationMentorat: {
        findMany: jest.fn().mockResolvedValue([
          {
            communication: 4,
            resolutionProblemes: 5,
            adaptabilite: 3,
            travailEquipe: 4,
          },
        ]),
      },
    };

    const service = new StagiairesService(prisma as any);

    const result = await service.getTableauDeBord('mentor-1');

    expect(result.statistiques.stagiairesActifs).toBe(1);
    expect(result.statistiques.demandesEnAttente).toBe(1);
    expect(result.statistiques.sessionsPlanifiees).toBe(1);
    expect(result.statistiques.moyenneEvaluation).toBe(4);
    expect(result.stagiaires).toHaveLength(1);
    expect(result.sessions[0].sujet).toBe('Suivi candidature');
    expect(result.demandesRecues).toHaveLength(2);
  });
});
