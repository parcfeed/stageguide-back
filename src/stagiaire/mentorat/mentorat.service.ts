import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreerDemandeMentoratDto } from './dto/creer-demande-mentorat.dto';
import { CreerObjectifDto } from './dto/creer-objectif.dto';
import { ModifierObjectifDto } from './dto/modifier-objectif.dto';

@Injectable()
export class MentoratStagiaireService {
  constructor(private readonly prisma: PrismaService) {}

  async listerDemandes(stagiaireId: string) {
    const demandeAcceptee = await this.prisma.demandeMentorat.findFirst({
      where: { stagiaireId, statut: 'ACCEPTEE' },
      include: {
        mentor: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            poste: true,
            entreprise: true,
            bio: true,
          },
        },
      },
    });

    const demandes = await this.prisma.demandeMentorat.findMany({
      where: { stagiaireId },
      include: {
        mentor: {
          select: { id: true, prenom: true, nom: true, poste: true, entreprise: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sessions = await this.prisma.sessionMentorat.findMany({
      where: { stagiaireId },
      include: {
        mentor: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { commenceLe: 'desc' },
    });

    const goals = await this.prisma.objectifMentorat.findMany({
      where: { utilisateurId: stagiaireId },
      orderBy: { createdAt: 'desc' },
    });

    const evaluation = await this.prisma.evaluationMentorat.findFirst({
      where: { stagiaireId },
    });

    return {
      stagiaireId,
      mentor: demandeAcceptee?.mentor
        ? {
            id: demandeAcceptee.mentor.id,
            name: `${demandeAcceptee.mentor.prenom} ${demandeAcceptee.mentor.nom}`,
            title: demandeAcceptee.mentor.poste,
            company: demandeAcceptee.mentor.entreprise,
            avatar: null,
            bio: demandeAcceptee.mentor.bio,
            expertise: [],
            matchScore: null,
          }
        : {
            name: null,
            title: null,
            company: null,
            avatar: null,
            bio: null,
            expertise: [],
            matchScore: null,
          },
      timeline: [],
      demandes,
      goals,
      sessions,
      evaluation,
    };
  }

  async creerDemande(stagiaireId: string, donnees: CreerDemandeMentoratDto) {
    let mentor: any = null;
    if (donnees.mentorId) {
      mentor = await this.prisma.user.findFirst({
        where: { id: donnees.mentorId, role: 'MENTOR', isActive: true, deletedAt: null },
      });
      if (!mentor) {
        throw new NotFoundException('Mentor introuvable ou inactif');
      }
    }

    const demande = await this.prisma.demandeMentorat.create({
      data: {
        stagiaireId,
        mentorId: donnees.mentorId ?? null,
        message: donnees.message ?? null,
      },
    });

    const stagiaire = await this.prisma.user.findUnique({
      where: { id: stagiaireId },
      select: { prenom: true, nom: true },
    });

    if (donnees.mentorId) {
      await this.prisma.notification.create({
        data: {
          utilisateurId: donnees.mentorId,
          titre: 'Demande de mentorat',
          message: `${stagiaire?.prenom ?? ''} ${stagiaire?.nom ?? ''} souhaite être mentoré par vous.`,
          type: 'MENTORAT',
        },
      });
    }

    return {
      id: demande.id,
      stagiaireId: demande.stagiaireId,
      mentorId: demande.mentorId,
      statut: demande.statut,
      message: 'Demande de mentorat créée avec succès',
    };
  }

  // ─── CRUD Objectifs ──────────────────────────────────────────────────────────

  async listerObjectifs(stagiaireId: string) {
    const objectifs = await this.prisma.objectifMentorat.findMany({
      where: { utilisateurId: stagiaireId },
      orderBy: { createdAt: 'desc' },
    });

    return { stagiaireId, objectifs };
  }

  async creerObjectif(stagiaireId: string, donnees: CreerObjectifDto) {
    const objectif = await this.prisma.objectifMentorat.create({
      data: {
        utilisateurId: stagiaireId,
        titre: donnees.titre,
        statut: donnees.statut ?? 'pending',
        creePar: stagiaireId,
      },
    });

    return {
      ...objectif,
      message: 'Objectif créé avec succès',
    };
  }

  async modifierObjectif(
    stagiaireId: string,
    objectifId: string,
    donnees: ModifierObjectifDto,
  ) {
    const objectif = await this.prisma.objectifMentorat.findFirst({
      where: { id: objectifId, utilisateurId: stagiaireId },
    });

    if (!objectif) {
      throw new NotFoundException('Objectif introuvable');
    }

    const updated = await this.prisma.objectifMentorat.update({
      where: { id: objectifId },
      data: {
        ...(donnees.titre !== undefined ? { titre: donnees.titre } : {}),
        ...(donnees.statut !== undefined ? { statut: donnees.statut } : {}),
      },
    });

    return {
      ...updated,
      message: 'Objectif mis à jour avec succès',
    };
  }

  async supprimerObjectif(stagiaireId: string, objectifId: string) {
    const objectif = await this.prisma.objectifMentorat.findFirst({
      where: { id: objectifId, utilisateurId: stagiaireId },
    });

    if (!objectif) {
      throw new NotFoundException('Objectif introuvable');
    }

    await this.prisma.objectifMentorat.delete({ where: { id: objectifId } });

    return {
      id: objectifId,
      message: 'Objectif supprimé avec succès',
    };
  }
}
