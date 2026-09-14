import { FichiersService } from './fichiers.service';

describe('FichiersService', () => {
  it('should list documents and conventions for the connected user', async () => {
    const prisma = {
      document: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'doc-1', nom: 'cv.pdf', typeMime: 'application/pdf' },
        ]),
      },
      convention: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'conv-1', entrepriseNom: 'Acme', statut: 'SIGNEE' },
        ]),
      },
    };

    const service = new FichiersService(prisma as any);
    const result = await service.lister('user-1');

    expect(result.utilisateurId).toBe('user-1');
    expect(result.fichiers).toHaveLength(1);
    expect(result.conventions).toHaveLength(1);
  });

  it('should store a new document with the provided metadata', async () => {
    const prisma = {
      document: {
        create: jest.fn().mockResolvedValue({
          id: 'doc-2',
          utilisateurId: 'user-1',
          nom: 'lettre-motivation.pdf',
          typeMime: 'application/pdf',
          url: 'https://example.com/lettre.pdf',
          typeDocument: 'LETTRE_MOTIVATION',
          tailleOctets: 2048,
        }),
      },
    };

    const service = new FichiersService(prisma as any);
    const result = await service.enregistrer('user-1', {
      nom: 'lettre-motivation.pdf',
      typeMime: 'application/pdf',
      url: 'https://example.com/lettre.pdf',
      typeDocument: 'LETTRE_MOTIVATION',
      tailleOctets: 2048,
    });

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        utilisateurId: 'user-1',
        nom: 'lettre-motivation.pdf',
        typeMime: 'application/pdf',
        url: 'https://example.com/lettre.pdf',
        typeDocument: 'LETTRE_MOTIVATION',
        tailleOctets: 2048,
      },
    });
    expect(result.nom).toBe('lettre-motivation.pdf');
    expect(result.message).toContain('enregistre');
  });
});
