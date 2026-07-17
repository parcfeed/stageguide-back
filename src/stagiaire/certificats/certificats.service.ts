import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CertificatsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(utilisateurId: string) {
    const certificats = await this.prisma.certificat.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      utilisateurId,
      certificats,
    };
  }
}
