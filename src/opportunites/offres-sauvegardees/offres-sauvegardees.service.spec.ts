import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OffresSauvegardeesService } from './offres-sauvegardees.service';

describe('OffresSauvegardeesService', () => {
  it('should list saved offers for the connected user', async () => {
    const prisma = {
      offreSauvegardee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'save-1',
            utilisateurId: 'user-1',
            offreStage: { id: 'stage-1', titre: 'Stage dev', partenaire: { nomEntreprise: 'Acme' } },
            offreEmploi: null,
          },
        ]),
      },
    };

    const service = new OffresSauvegardeesService(prisma as any);
    const result = await service.lister('user-1');

    expect(result.utilisateurId).toBe('user-1');
    expect(result.sauvegardes).toHaveLength(1);
    expect(result.sauvegardes[0].offreStage.titre).toBe('Stage dev');
  });

  it('should save a stage offer once and reject duplicates', async () => {
    const prisma = {
      offreStage: {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage-1', isArchived: false }),
      },
      offreSauvegardee: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'save-1' }),
        create: jest.fn().mockResolvedValue({ id: 'save-1', utilisateurId: 'user-1', offreStageId: 'stage-1', offreEmploiId: null, createdAt: new Date() }),
      },
    };

    const service = new OffresSauvegardeesService(prisma as any);

    await expect(service.sauvegarder('user-1', { offreStageId: 'stage-1' })).resolves.toEqual(
      expect.objectContaining({
        id: 'save-1',
        utilisateurId: 'user-1',
        offreStageId: 'stage-1',
        message: 'Offre sauvegardée avec succès',
      }),
    );

    await expect(service.sauvegarder('user-1', { offreStageId: 'stage-1' })).rejects.toThrow(BadRequestException);
  });

  it('should delete a saved offer only for its owner', async () => {
    const prisma = {
      offreSauvegardee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'save-1', utilisateurId: 'user-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'save-1' }),
      },
    };

    const service = new OffresSauvegardeesService(prisma as any);
    const result = await service.supprimer('user-1', 'save-1');

    expect(prisma.offreSauvegardee.delete).toHaveBeenCalledWith({ where: { id: 'save-1' } });
    expect(result.message).toContain('retirée');
  });

  it('should reject missing saved offer deletion', async () => {
    const prisma = {
      offreSauvegardee: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new OffresSauvegardeesService(prisma as any);

    await expect(service.supprimer('user-1', 'missing')).rejects.toThrow(NotFoundException);
  });
});
