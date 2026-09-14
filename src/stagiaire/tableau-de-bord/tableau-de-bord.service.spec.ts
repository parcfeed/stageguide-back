import { TableauDeBordService } from './tableau-de-bord.service';

describe('TableauDeBordService', () => {
  it('should include upcoming deadline reminders in the dashboard payload', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          prenom: 'Jean',
          nom: 'Dupont',
          telephone: '0600000000',
          ecole: 'ParisTech',
          niveauEtudes: 'Master 2',
          bio: 'Bio',
          cv: { id: 'cv-1' },
        }),
      },
      utilisateurCompetence: { count: jest.fn().mockResolvedValue(1) },
      projetPortfolio: { count: jest.fn().mockResolvedValue(2) },
      candidature: { count: jest.fn().mockResolvedValue(4) },
      certificat: { count: jest.fn().mockResolvedValue(1) },
      inscriptionFormation: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      demandeMentorat: { findFirst: jest.fn().mockResolvedValue(null) },
      sessionMentorat: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
      participantConversation: { findMany: jest.fn().mockResolvedValue([]) },
      convention: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'conv-1',
            entrepriseNom: 'Acme',
            dateFin: new Date('2026-10-15T00:00:00Z'),
          },
        ]),
      },
      offreSauvegardee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'save-1',
            offreStage: {
              id: 'stage-1',
              titre: 'Stage data scientist',
              dateExpiration: new Date('2026-10-10T00:00:00Z'),
            },
            offreEmploi: null,
          },
        ]),
      },
    };

    const service = new TableauDeBordService(prisma as any);

    const result = await service.getVueEnsemble('user-1');

    expect(result.rappels).toBeDefined();
    expect(result.rappels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CONVENTION',
          titre: 'Convention Acme',
        }),
        expect.objectContaining({
          type: 'OFFRE',
          titre: 'Stage data scientist',
        }),
      ]),
    );

    expect(result.rapportPdf).toEqual(
      expect.objectContaining({
        format: 'pdf',
        documentType: 'rapport-stagiaire',
      }),
    );
    expect(result.calendrier).toEqual(
      expect.objectContaining({
        events: expect.any(Array),
      }),
    );
  });
});
