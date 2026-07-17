import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnregistrerFichierDto } from './dto/enregistrer-fichier.dto';

@Injectable()
export class FichiersService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(utilisateurId: string) {
    const fichiers = await this.prisma.document.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
    });

    const conventions = await this.prisma.convention.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      utilisateurId,
      conventions,
      fichiers,
    };
  }

  async enregistrer(utilisateurId: string, donnees: EnregistrerFichierDto) {
    const document = await this.prisma.document.create({
      data: {
        utilisateurId,
        nom: donnees.nom,
        typeMime: donnees.typeMime,
        url: donnees.url ?? null,
        typeDocument: (donnees.typeDocument as any) ?? 'AUTRE',
        tailleOctets: donnees.tailleOctets ?? null,
      },
    });

    return {
      id: document.id,
      utilisateurId: document.utilisateurId,
      nom: document.nom,
      typeMime: document.typeMime,
      url: document.url,
      typeDocument: document.typeDocument,
      tailleOctets: document.tailleOctets,
      message: 'Fichier enregistre avec succes',
    };
  }
}
