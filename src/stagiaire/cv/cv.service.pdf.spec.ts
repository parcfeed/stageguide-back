import { CvService } from './cv.service';
import { Readable } from 'stream';

describe('CvService - génération PDF', () => {
  it('génère un vrai fichier PDF (commence par %PDF) avec les données et liens du CV', async () => {
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
          projetsPortfolio: [
            {
              id: 'p1',
              titre: 'Projet StageGuide',
              description: 'Plateforme de stage',
              tags: ['NestJS', 'Angular'],
              lienProjet: 'https://github.com/alice/stageguide',
            },
          ],
          experiencesProfessionnelles: [
            {
              id: 'e1',
              titrePoste: 'Développeuse stagiaire',
              entrepriseNom: 'Acme',
              description: 'Développement de l’API NestJS',
              dateDebut: new Date('2026-01-05'),
              dateFin: new Date('2026-06-30'),
            },
          ],
        }),
      },
      certificat: {
        findMany: jest.fn().mockResolvedValue([
          {
            titre: 'Certif Angular',
            urlDocument: 'https://stageguide.test/certificats/angular',
            hashVerification: 'abc123def456',
            createdAt: new Date('2026-07-17'),
          },
        ]),
      },
    } as any;

    const service = new CvService(prisma);
    const file = await service.getPdf('user-1');

    const chunks: Buffer[] = [];
    for await (const chunk of file.getStream() as Readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    const disposition = file.options?.disposition ?? '';
    expect(disposition).toContain('CV_Alice_Martin.pdf');

    // Les liens (projet, email, téléphone, certificat) sont embarqués comme
    // annotations cliquables dans le PDF.
    const contenuBrut = buffer.toString('latin1');
    expect(contenuBrut).toContain('https://github.com/alice/stageguide');
    expect(contenuBrut).toContain('mailto:alice@example.com');
    expect(contenuBrut).toContain('tel:0612345678');
    expect(contenuBrut).toContain(
      'https://stageguide.test/certificats/angular',
    );
  });
});
