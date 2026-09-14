import { NotFoundException } from '@nestjs/common';
import { ProfilMentorService } from './profil.service';

describe('ProfilMentorService', () => {
  it('should return the mentor profile fields', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mentor-1',
          prenom: 'Alice',
          nom: 'Martin',
          telephone: '0600000000',
          entreprise: 'Acme',
          poste: 'Lead Engineer',
          bio: 'Mentor',
        }),
      },
    };

    const service = new ProfilMentorService(prisma as any);
    const result = await service.getProfil('mentor-1');

    expect(result.utilisateurId).toBe('mentor-1');
    expect(result.entreprise).toBe('Acme');
    expect(result.poste).toBe('Lead Engineer');
  });

  it('should update the mentor profile', async () => {
    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue({
          id: 'mentor-1',
          prenom: 'Alice',
          nom: 'Martin',
          telephone: '0700000000',
          entreprise: 'Globex',
          poste: 'Product Manager',
          bio: 'Mentor senior',
        }),
      },
    };

    const service = new ProfilMentorService(prisma as any);
    const result = await service.modifierProfil('mentor-1', {
      telephone: '0700000000',
      entreprise: 'Globex',
      poste: 'Product Manager',
      bio: 'Mentor senior',
    });

    expect(result.entreprise).toBe('Globex');
    expect(result.message).toContain('mis a jour');
  });

  it('should reject a missing mentor profile', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new ProfilMentorService(prisma as any);

    await expect(service.getProfil('missing')).rejects.toThrow(NotFoundException);
  });
});
