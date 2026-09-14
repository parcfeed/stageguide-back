import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DemandeConnexionDto } from './dto/demande-connexion.dto';
import { RepondreConnexionDto } from './dto/repondre-connexion.dto';

@Injectable()
export class ReseauService {
  constructor(private readonly prisma: PrismaService) {}

  async listerMembres(recherche?: string, role?: string) {
    const where: any = {
      isActive: true,
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (recherche) {
      where.OR = [
        { prenom: { contains: recherche, mode: 'insensitive' } },
        { nom: { contains: recherche, mode: 'insensitive' } },
        { ecole: { contains: recherche, mode: 'insensitive' } },
        { entreprise: { contains: recherche, mode: 'insensitive' } },
        { poste: { contains: recherche, mode: 'insensitive' } },
      ];
    }

    const membres = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        prenom: true,
        nom: true,
        role: true,
        ecole: true,
        niveauEtudes: true,
        entreprise: true,
        poste: true,
        bio: true,
        createdAt: true,
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return {
      total: membres.length,
      membres,
    };
  }

  async getSuggestions(utilisateurId: string) {
    const utilisateur = await this.prisma.user.findUnique({
      where: { id: utilisateurId },
      include: {
        competences: { include: { competence: true } },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Récupérer les connexions existantes pour les exclure
    const connexionsExistantes = await this.prisma.connexionReseau.findMany({
      where: {
        OR: [{ demandeurId: utilisateurId }, { receveurId: utilisateurId }],
      },
      select: { demandeurId: true, receveurId: true },
    });

    const exclusIds = new Set<string>([utilisateurId]);
    for (const c of connexionsExistantes) {
      exclusIds.add(c.demandeurId);
      exclusIds.add(c.receveurId);
    }

    const candidats = await this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(exclusIds) },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        role: true,
        ecole: true,
        entreprise: true,
        poste: true,
        bio: true,
      },
      take: 20,
    });

    const suggestions = candidats
      .map((candidat) => {
        let score = 50;
        const raisons: string[] = [];

        if (candidat.ecole && utilisateur.ecole && candidat.ecole.toLowerCase() === utilisateur.ecole.toLowerCase()) {
          score += 25;
          raisons.push(`Même établissement : ${candidat.ecole}`);
        }

        if (candidat.entreprise && utilisateur.entreprise && candidat.entreprise.toLowerCase() === utilisateur.entreprise.toLowerCase()) {
          score += 25;
          raisons.push(`Même entreprise : ${candidat.entreprise}`);
        }

        if (candidat.role === 'MENTOR') {
          score += 15;
          raisons.push('Mentor certifié disponible');
        }

        return {
          ...candidat,
          scoreMatch: Math.min(99, score),
          raisons: raisons.length > 0 ? raisons : ['Membre recommandé de la communauté'],
        };
      })
      .sort((a, b) => b.scoreMatch - a.scoreMatch)
      .slice(0, 10);

    return {
      utilisateurId,
      total: suggestions.length,
      suggestions,
    };
  }

  async demanderConnexion(demandeurId: string, donnees: DemandeConnexionDto) {
    if (demandeurId === donnees.destinataireId) {
      throw new BadRequestException('Vous ne pouvez pas vous connecter avec vous-même');
    }

    const destinataire = await this.prisma.user.findUnique({
      where: { id: donnees.destinataireId, isActive: true, deletedAt: null },
    });

    if (!destinataire) {
      throw new NotFoundException('Utilisateur destinataire introuvable');
    }

    const existante = await this.prisma.connexionReseau.findFirst({
      where: {
        OR: [
          { demandeurId, receveurId: donnees.destinataireId },
          { demandeurId: donnees.destinataireId, receveurId: demandeurId },
        ],
      },
    });

    if (existante) {
      throw new ConflictException(`Une relation existe déjà avec le statut "${existante.statut}"`);
    }

    const connexion = await this.prisma.connexionReseau.create({
      data: {
        demandeurId,
        receveurId: donnees.destinataireId,
        message: donnees.message ?? null,
        statut: 'EN_ATTENTE',
      },
    });

    const demandeur = await this.prisma.user.findUnique({
      where: { id: demandeurId },
      select: { prenom: true, nom: true },
    });

    await this.prisma.notification.create({
      data: {
        utilisateurId: donnees.destinataireId,
        titre: 'Demande de connexion reçue',
        message: `${demandeur?.prenom ?? ''} ${demandeur?.nom ?? ''} souhaite se connecter avec vous sur le réseau StageGuide.`,
        type: 'RESEAU',
      },
    });

    return {
      ...connexion,
      message: 'Demande de connexion envoyée avec succès',
    };
  }

  async listerConnexions(utilisateurId: string) {
    const connexions = await this.prisma.connexionReseau.findMany({
      where: {
        OR: [{ demandeurId: utilisateurId }, { receveurId: utilisateurId }],
      },
      include: {
        demandeur: { select: { id: true, prenom: true, nom: true, role: true, poste: true, entreprise: true, ecole: true } },
        receveur: { select: { id: true, prenom: true, nom: true, role: true, poste: true, entreprise: true, ecole: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const actives = connexions
      .filter((c) => c.statut === 'ACCEPTEE')
      .map((c) => {
        const contact = c.demandeurId === utilisateurId ? c.receveur : c.demandeur;
        return {
          id: c.id,
          contact,
          connecteLe: c.updatedAt,
        };
      });

    const demandesRecues = connexions.filter(
      (c) => c.receveurId === utilisateurId && c.statut === 'EN_ATTENTE',
    );

    const demandesEnvoyees = connexions.filter(
      (c) => c.demandeurId === utilisateurId && c.statut === 'EN_ATTENTE',
    );

    return {
      totalActives: actives.length,
      actives,
      demandesRecues,
      demandesEnvoyees,
    };
  }

  async repondreConnexion(utilisateurId: string, connexionId: string, donnees: RepondreConnexionDto) {
    const connexion = await this.prisma.connexionReseau.findFirst({
      where: { id: connexionId, receveurId: utilisateurId },
    });

    if (!connexion) {
      throw new NotFoundException('Demande de connexion introuvable ou non autorisée');
    }

    const updated = await this.prisma.connexionReseau.update({
      where: { id: connexionId },
      data: { statut: donnees.decision },
    });

    const receveur = await this.prisma.user.findUnique({
      where: { id: utilisateurId },
      select: { prenom: true, nom: true },
    });

    if (donnees.decision === 'ACCEPTEE') {
      await this.prisma.notification.create({
        data: {
          utilisateurId: connexion.demandeurId,
          titre: 'Demande de connexion acceptée',
          message: `${receveur?.prenom ?? ''} ${receveur?.nom ?? ''} a accepté votre demande de connexion.`,
          type: 'RESEAU',
        },
      });
    }

    return {
      id: updated.id,
      statut: updated.statut,
      message: donnees.decision === 'ACCEPTEE' ? 'Connexion acceptée' : 'Connexion refusée',
    };
  }
}
