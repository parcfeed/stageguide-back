import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { GenererCertificatDto } from './dto/generer-certificat.dto';

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

  async generer(utilisateurId: string, donnees: GenererCertificatDto) {
    const hashVerification = randomBytes(16).toString('hex');

    const certificat = await this.prisma.certificat.create({
      data: {
        utilisateurId,
        titre: donnees.titre,
        hashVerification,
        urlDocument: donnees.urlDocument ?? null,
      },
    });

    await this.prisma.notification.create({
      data: {
        utilisateurId,
        titre: 'Nouveau certificat disponible',
        message: `Votre certificat "${certificat.titre}" a été généré avec succès.`,
        type: 'CERTIFICAT',
      },
    });

    return certificat;
  }
}
