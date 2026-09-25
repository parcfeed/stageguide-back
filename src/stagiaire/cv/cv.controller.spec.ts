import { CvController } from './cv.controller';

describe('CvController', () => {
  it('renvoie un lien public exploitable pour le partage du CV', async () => {
    const service = {
      createShareToken: jest.fn().mockReturnValue('token-123'),
      buildPublicUrl: jest.fn().mockReturnValue('http://localhost:4200/cv/partage/token-123'),
    } as any;

    const controller = new CvController(service);
    const response = await controller.createShareToken({ id: 'user-1' });

    // Champ consommé par le frontend (cv-view.component.html)
    expect(response.lienPublic).toBe('http://localhost:4200/cv/partage/token-123');
    expect(response.publicUrl).toBe('http://localhost:4200/cv/partage/token-123');
    expect(response.link).toBe('http://localhost:4200/cv/partage/token-123');
    expect(response.url).toBe('http://localhost:4200/cv/partage/token-123');
    expect(response.token).toBe('token-123');
  });

  it('permet de télécharger le CV d un stagiaire cible pour un profil autorisé', async () => {
    const service = {
      getPdf: jest.fn().mockResolvedValue('pdf-buffer'),
    } as any;

    const controller = new CvController(service);
    const response = await controller.getPdfByUserId({ id: 'mentor-1' }, 'stagiaire-42');

    expect(service.getPdf).toHaveBeenCalledWith('stagiaire-42');
    expect(response).toBe('pdf-buffer');
  });
});
