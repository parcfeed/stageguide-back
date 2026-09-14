import { OffresStageService } from './offres-stage.service';

describe('OffresStageService', () => {
  it('calcule des recommandations avec score et raisons', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          competences: [
            { competence: { nom: 'JavaScript' } },
            { competence: { nom: 'TypeScript' } },
          ],
          ecole: 'Université Paris',
          niveauEtudes: 'Master 2',
        }),
      },
      offreStage: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'offer-1',
            titre: 'Développeur Web Front-end',
            description: 'Stage projet React / TypeScript',
            ville: 'Paris',
            domaine: 'Informatique',
            duree: '4 mois',
            remote: false,
            datePublication: new Date(),
            isArchived: false,
            partenaire: { nomEntreprise: 'Acme' },
          },
          {
            id: 'offer-2',
            titre: 'Chargé marketing',
            description: 'Campagnes digitales',
            ville: 'Lyon',
            domaine: 'Marketing',
            duree: '3 mois',
            remote: true,
            datePublication: new Date(),
            isArchived: false,
            partenaire: { nomEntreprise: 'Sigma' },
          },
        ]),
      },
    } as any;

    const service = new OffresStageService(prisma);
    const result = await service.getRecommendations('user-1');

    expect(result.offres.length).toBeGreaterThan(0);
    expect(result.offres[0]).toHaveProperty('score');
    expect(result.offres[0]).toHaveProperty('matchReasons');
    expect(result.offres[0].score).toBeGreaterThan(0);
  });
});
