import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CvService {
  constructor(private readonly prisma: PrismaService) {}

  createShareToken(utilisateurId: string) {
    const encodedUserId = Buffer.from(utilisateurId).toString('base64url');
    return `${encodedUserId}.${randomBytes(12).toString('hex')}`;
  }

  async getSharedCvByToken(token: string) {
    const separatorIndex = token.lastIndexOf('.');
    if (separatorIndex === -1) {
      throw new NotFoundException('Token de partage invalide');
    }

    const encodedUserId = token.slice(0, separatorIndex);
    const utilisateurId = Buffer.from(encodedUserId, 'base64url').toString('utf-8');

    const cv = await this.getCv(utilisateurId);
    return {
      ...cv,
      shareToken: token,
      shared: true,
      publicUrl: `/stagiaire/cv/partage/${token}`,
    };
  }

  async getCv(utilisateurId: string) {
    const utilisateur = await this.prisma.user.findUnique({
      where: { id: utilisateurId },
      include: {
        cv: true,
        competences: {
          include: { competence: true },
        },
        projetsPortfolio: true,
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const certificats = await this.prisma.certificat.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      utilisateurId,
      profil: {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        ecole: utilisateur.ecole,
        niveauEtudes: utilisateur.niveauEtudes,
        bio: utilisateur.bio,
      },
      cv: utilisateur.cv ?? {
        titre: null,
        resume: null,
        formationResume: null,
        experienceResume: null,
        urlPdf: null,
      },
      competences: utilisateur.competences.map((item) => ({
        id: item.competence.id,
        nom: item.competence.nom,
        categorie: item.competence.categorie,
        niveau: item.niveau,
      })),
      projets: utilisateur.projetsPortfolio,
      certificats,
      generatedAt: new Date().toISOString(),
    };
  }

  async getPdf(utilisateurId: string) {
    const cv = await this.getCv(utilisateurId);

    return {
      utilisateurId,
      format: 'pdf',
      url: cv.cv?.urlPdf ?? null,
      message: 'Le PDF du CV n a pas encore été généré. Le backend fournit les données structurées du CV.',
      cv,
    };
  }
}
