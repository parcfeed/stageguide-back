import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StagiairesService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(mentorId: string) {
    const demandesAcceptees = await this.prisma.demandeMentorat.findMany({
      where: { mentorId, statut: 'ACCEPTEE' },
      include: {
        stagiaire: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            ecole: true,
            niveauEtudes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stagiaires = demandesAcceptees.map((d) => d.stagiaire);

    return {
      mentorId,
      stagiaires,
    };
  }

  async getTableauDeBord(mentorId: string) {
    const demandes = await this.prisma.demandeMentorat.findMany({
      where: { mentorId },
      include: {
        stagiaire: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            ecole: true,
            niveauEtudes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sessions = await this.prisma.sessionMentorat.findMany({
      where: { mentorId },
      orderBy: { commenceLe: 'asc' },
    });

    const evaluations = await this.prisma.evaluationMentorat.findMany({
      where: { mentorId },
    });

    const stagiairesActifs = demandes.filter((demande) => demande.statut === 'ACCEPTEE');
    const demandesEnAttente = demandes.filter((demande) => demande.statut === 'EN_ATTENTE');

    const moyenneNotes =
      evaluations.length > 0
        ? evaluations.reduce((total, evaluation) => {
            const notes = [
              evaluation.communication,
              evaluation.resolutionProblemes,
              evaluation.adaptabilite,
              evaluation.travailEquipe,
            ].filter((note): note is number => typeof note === 'number');
            return total + (notes.length > 0 ? notes.reduce((sum, note) => sum + note, 0) / notes.length : 0);
          }, 0) /
          evaluations.length
        : 0;

    return {
      mentorId,
      statistiques: {
        stagiairesActifs: stagiairesActifs.length,
        demandesEnAttente: demandesEnAttente.length,
        sessionsPlanifiees: sessions.length,
        moyenneEvaluation: Number(moyenneNotes.toFixed(2)),
      },
      stagiaires: stagiairesActifs.map((demande) => ({
        id: demande.stagiaire.id,
        prenom: demande.stagiaire.prenom,
        nom: demande.stagiaire.nom,
        ecole: demande.stagiaire.ecole,
        niveauEtudes: demande.stagiaire.niveauEtudes,
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        stagiaireId: session.stagiaireId,
        sujet: session.sujet,
        commenceLe: session.commenceLe,
        termineLe: session.termineLe,
        statut: session.statut,
      })),
      demandesRecues: demandes.map((demande) => ({
        id: demande.id,
        stagiaireId: demande.stagiaireId,
        statut: demande.statut,
        createdAt: demande.createdAt,
      })),
    };
  }
}
