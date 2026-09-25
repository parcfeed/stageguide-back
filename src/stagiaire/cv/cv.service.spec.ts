import { CvService } from './cv.service';

describe('CvService', () => {
  it('génère un token de partage et retrouve le CV associé', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          prenom: 'Alice',
          nom: 'Martin',
          email: 'alice@example.com',
          telephone: '0612345678',
          ecole: 'Université Lyon',
          niveauEtudes: 'Master 2',
          bio: 'Étudiante en informatique',
          cv: {
            titre: 'CV développeuse',
            resume: 'Résumé',
            formationResume: 'Master',
            experienceResume: 'Stage',
          },
          competences: [
            {
              competence: {
                id: 'c1',
                nom: 'TypeScript',
                categorie: 'Frontend',
              },
              niveau: 4,
            },
          ],
          projetsPortfolio: [{ id: 'p1', titre: 'Projet StageGuide' }],
          experiencesProfessionnelles: [
            {
              id: 'e1',
              titrePoste: 'Développeuse stagiaire',
              entrepriseNom: 'Acme',
              description: 'API NestJS',
              dateDebut: new Date('2026-01-05'),
              dateFin: new Date('2026-06-30'),
            },
          ],
        }),
      },
      certificat: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new CvService(prisma);
    const token = service.createShareToken('user-1');

    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(10);

    const shared = await service.getSharedCvByToken(token);
    expect(shared).toHaveProperty('utilisateurId', 'user-1');
    expect(shared.profil.prenom).toBe('Alice');
    expect(shared.experiences).toHaveLength(1);
    expect(shared.experiences[0].titrePoste).toBe('Développeuse stagiaire');
    expect(shared.experiences[0].entrepriseNom).toBe('Acme');
  });
});
